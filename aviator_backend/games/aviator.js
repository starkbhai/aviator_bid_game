

 const GAME_STATE = {
  WAITING: "WAITING",
  RUNNING: "RUNNING",
  CRASHED: "CRASHED",
};

let crashTimeout = null;
let multiplier = 1.0;
let actualTotalBetsAmount = 0;

const crypto = require("crypto");
const redis = require("../config/redis");
const { REDIS_KEYS } = require("../constants/redisKeys");

// * Random POINT:--Generator
function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const serverSeed = crypto.randomBytes(32).toString("hex");

// Correct Aviator crash formula
function getCrashMultiplier(serverSeed, nonce, houseEdge = 0.03) {
  const hash = sha256(serverSeed + nonce);
  const h = parseInt(hash.substring(0, 8), 16);
  const p = h / 2 ** 32;

  return Math.max(1, (1 - houseEdge) / p);
}

function generate6Digit() {
  return Math.floor(100000 + Math.random() * 900000);
}

async function addToTotalBets(amount, key) {
  await redis.incrby(key, amount);
}
async function removeToTotalBets(amount, key) {
  await redis.decrby(key, amount);
}
async function getTotalActualBets() {
  const total = await redis.get("aviator:current:total_actual_bets");
  return Number(total) || 0;
}

async function addUserBet(bet, hashKey, totalKey) {
  const exists = await redis.hexists(hashKey, bet.userId);

  if (!exists) {
    await redis.hset(hashKey, bet.userId, JSON.stringify(bet));
    await addToTotalBets(bet.amount, totalKey);
    return true;
  }

  return false; // already placed bet
}

// * Remove User Bet
async function removeUserBet(bet, hashKey, totalKey) {
  const exists = await redis.hexists(hashKey, bet.userId);
  if (!exists) {
    return false;
  }

  const betData = await redis.hget(hashKey, bet.userId);
  const storedBet = JSON.parse(betData);
  await removeToTotalBets(storedBet.amount, totalKey);
  // Remove bet
  await redis.hdel(hashKey, bet.userId);

  return true;
}

async function getCurrentUserBets() {
  const data = await redis.hgetall("aviator:current:bets");
  return Object.values(data).map((bet) => JSON.parse(bet));
}

async function buildImaginaryPayload() {
  const multiplier = Number(await redis.get("aviator:current:multiplier"));

  const totalActual = Number(
    await redis.get("aviator:current:total_actual_bets")
  );

  const totalImaginary = Number((totalActual * multiplier).toFixed(2));

  const bets = await redis.hgetall(currentBetskey);

  const users = {};

  for (const userId in bets) {
    const bet = JSON.parse(bets[userId]);

    users[userId] = Number((bet.amount * multiplier).toFixed(2));
  }

  return { multiplier, totalImaginary, users };
}

// * Cashout function
async function handleCashout(msg) {
  const imaginaryAmount = Number(
    (Number(msg.amount) * Number(msg.multiplier)).toFixed(2)
  );

  const luaScript = `
        local total = tonumber(redis.call("GET", KEYS[1]) or "0")
        local cashout = tonumber(ARGV[1])
        if total < cashout then
            return 0
        end
        redis.call("DECRBY", KEYS[1], cashout)
        return 1
    `;

  const result = await redis.eval(
    luaScript,
    1,
    "aviator:current:total_actual_bets",
    imaginaryAmount
  );

  if (result === 0) {
    console.log("Insufficient bet amount for cashout");

    return false;
  }

  console.log("Cashout successful:", imaginaryAmount);
  return true;
}

async function rotateGameBets() {
  const exists = await redis.exists(REDIS_KEYS.NEXT_GAME_BETS_HASH);
  // Always clear current
  await redis.del(REDIS_KEYS.CURRENT_GAME_BETS_HASH);

  if (exists) {
    await redis.rename(
      REDIS_KEYS.NEXT_GAME_BETS_HASH,
      REDIS_KEYS.CURRENT_GAME_BETS_HASH
    );
  } else {
    // create empty current hash
    await redis.hset(REDIS_KEYS.CURRENT_GAME_BETS_HASH, "__init__", "{}");
    await redis.hdel(REDIS_KEYS.CURRENT_GAME_BETS_HASH, "__init__");
  }
}



module.exports={
  GAME_STATE,
  addUserBet,
  removeUserBet,
  getCurrentUserBets,
  handleCashout,
  rotateGameBets,
  generate6Digit,
  getCrashMultiplier
}
const redis = require("../../redis/redis");

const GAME_STATE = {
  WAITING: "WAITING",
  RUNNING: "RUNNING",
  CRASHED: "CRASHED",
};

let crashTimeout = null;
let multiplier = 1.0;
let actualTotalBetsAmount = 0;
const CURRENT_GAME_BETS_HASH_KEY = "aviator:game:current:bets";
const NEXT_GAME_BETS_HASH_KEY = "aviator:game:next:bets";
const AVIATOR_GAME_STATE_KEY = "aviator:game:state";
const AVIATOR_MULTIPLIER_KEY = "aviator:game:multiplier";
const CURRENT_GAME_TOTAL_BETS_KEY = "aviator:game:current:total_bets";
const NEXT_GAME_TOTAL_BETS_KEY = "aviator:game:next:total_bets";
const GAME_ORDER_ID_KEY = "aviator:game:orderid";



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
  const exists = await redis.exists(NEXT_GAME_BETS_HASH_KEY);
  // Always clear current
  await redis.del(CURRENT_GAME_BETS_HASH_KEY);

  if (exists) {
    await redis.rename(
      NEXT_GAME_BETS_HASH_KEY,
      CURRENT_GAME_BETS_HASH_KEY
    );
  } else {
    // create empty current hash
    await redis.hset(CURRENT_GAME_BETS_HASH_KEY, "__init__", "{}");
    await redis.hdel(CURRENT_GAME_BETS_HASH_KEY, "__init__");
  }
}


module.exports = function aviatorGame(wsServer) {
  let gameState = GAME_STATE.WAITING;

  let waitTimer = 10; // 20 seconds waiting

  let crashPoint = 20.0;

  let waitInterval = null;
  let flyInterval = null;

  /* ================= BROADCAST ================= */
  function broadcast(payload) {
    wsServer.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(payload));
      }
    });
  }

  /* ================= NEW CLIENT SYNC ================= */
  wsServer.on("connection", async (client) => {
    const [
        aviatorGameState,
        orderId,
        gameMultiplier,
      ] = await redis.mget(
        AVIATOR_GAME_STATE_KEY,
        GAME_ORDER_ID_KEY,
        AVIATOR_MULTIPLIER_KEY,
       );

    client.send(
      JSON.stringify({
        event: "aviator_sync",
        state: aviatorGameState || gameState,
        timer: waitTimer,
        gameMultiplier,
        orderId
      })
    );

    client.on("message", (data) => {
      const msg = JSON.parse(data);

      if (msg.event === "aviator_bet_placed") {
        console.log("Bet received:", msg);
        if (msg.gameState === GAME_STATE.WAITING) {
          let isbetsAdd = addUserBet(
            msg,
            CURRENT_GAME_BETS_HASH_KEY,
            CURRENT_GAME_TOTAL_BETS_KEY
          );
          if (isbetsAdd) {
            console.log("Bet added to current game");
          } else {
            console.log("Bet already placed for current game");
          }
        } else {
          let isbetsAdd = addUserBet(
            msg,
            NEXT_GAME_BETS_HASH_KEY,
            NEXT_GAME_TOTAL_BETS_KEY
          );
          if (isbetsAdd) {
            console.log("Bet added to next game");
          } else {
            console.log("Bet already placed for next game");
          }
        }
      }
      if (msg.event === "aviator_bet_cancel") {
        // * Bid Cancel
        if (msg.gameState === GAME_STATE.WAITING) {
          let isbetremove = removeUserBet(
            msg,
            CURRENT_GAME_BETS_HASH_KEY,
            CURRENT_GAME_TOTAL_BETS_KEY
          );
          isbetremove
            ? console.log("Successfully Bet Remove Current map")
            : console.log("NOT REMOVE IN Current map");
          if (isbetremove) {
            broadcast({
              event: "bid_cancel",
              userId: msg.userId,
            });
            broadcast({
              event: "toast",
              userId: msg.userId,
              msg: "Successfully Bet Remove Current map",
            });
          } else {
            broadcast({
              event: "toast",
              userId: msg.userId,
              msg: "NOT REMOVE IN Current map",
            });
          }
        } else {
          let isbetremoveNextMap = removeUserBet(
            msg,
            NEXT_GAME_BETS_HASH_KEY,
            NEXT_GAME_TOTAL_BETS_KEY
          );
          isbetremoveNextMap
            ? console.log("Successfully Bet Remove NEXTmap")
            : console.log("NOT REMOVE IN Current NEXTmap");
          if (isbetremoveNextMap) {
            broadcast({
              event: "bid_cancel",
              userId: msg.userId,
            });
            broadcast({
              event: "toast",
              userId: msg.userId,
              msg: "Successfully Bet Remove NEXTmap",
            });
          } else {
            broadcast({
              event: "toast",
              userId: msg.userId,
              msg: "NOT REMOVE IN Current NEXTmap",
            });
          }
        }
      }

      // Aviator Cashed out
      if (msg.event === "aviator_cashout" && gameState === GAME_STATE.RUNNING) {
        console.log(
          "CAshed OUT:",
          (Number(msg.amount) * Number(msg.multiplier)).toFixed(2)
        );
        let hasPlanCrashed = handleCashout(msg);
        if (hasPlanCrashed) {
          crashPlane();
          broadcast({
            event: "toast",
            userId: msg.userId,
            msg: "Insufficient bet amount for cashout",
          });
        } else {
          broadcast({
            event: "toast",
            userId: msg.userId,
            msg: `Cashout successful-${(
              Number(msg.amount) * Number(msg.multiplier)
            ).toFixed(2)}`,
          });
        }
      }
    });
  });

  /* ================= WAITING STATE ================= */
  async function startWaiting() {
    gameState = GAME_STATE.WAITING;
    waitTimer = 20;
    let order_id = generate6Digit();
    // ✅ store order_id
    await redis.set(GAME_ORDER_ID_KEY, order_id);
    broadcast({
      event: "aviator_state",
      state: gameState,
      timer: waitTimer,
    });
    rotateGameBets();
    
    broadcast({
      event: "aviator_orderId",
      aviator_orderId: order_id,
    });

    waitInterval = setInterval(() => {
      waitTimer--;

      broadcast({
        event: "aviator_timer",
        timer: waitTimer,
      });

      if (waitTimer <= 0) {
        clearInterval(waitInterval);
        startFlying();
      }
    }, 1000);
  }

  /* ================= FLYING STATE ================= */
  function startFlying() {
    gameState = GAME_STATE.RUNNING;
    multiplier = 1.0;

    // 🎯 SERVER SIDE CRASH POINT
    crashPoint = generateCrashPoint();

    broadcast({
      event: "aviator_state",
      state: gameState,
    });

    // 🕐 FORCE CRASH AFTER 1 MINUTE (ONCE)
    crashTimeout = setTimeout(() => {
      crashPlane();
    }, 60000);

    flyInterval = setInterval(async () => {
      // multiplier += 0.01;
      multiplier *= 1.01;

      multiplier = Number(multiplier.toFixed(2));

      // ✅ store ONLY multiplier
      await redis.set(AVIATOR_MULTIPLIER_KEY, multiplier);
      //  const payload = await buildImaginaryPayload();

      broadcast({
        event: "aviator_tick",
        multiplier: Number(multiplier.toFixed(2)),
      });

      // if (multiplier >= crashPoint) {
      //     crashPlane();
      // }
    }, 100);
  }

  /* ================= CRASH STATE ================= */
  async function crashPlane() {
    clearInterval(flyInterval);
    clearTimeout(crashTimeout);

    gameState = GAME_STATE.CRASHED;
    multiplier = 1.0;
    await redis.set(AVIATOR_MULTIPLIER_KEY, multiplier);

    broadcast({
      // event: "aviator_crash",
      // crashPoint: Number(crashPoint.toFixed(2)),
      event: "aviator_state",
      state: gameState,
    });
    broadcast({
      event: "aviator_tick",
      multiplier: Number(multiplier.toFixed(2)),
    });

    // ⏳ wait 2 seconds then restart
    setTimeout(() => {
      startWaiting();
    }, 2000);
  }

  /* ================= CRASH ALGORITHM ================= */
  function generateCrashPoint() {
    // Simple demo logic
    // You can replace with provably fair later
    return Number((Math.random() * 4 + 1.2).toFixed(2));
  }

  /* ================= AUTO START ================= */
  startWaiting();
};

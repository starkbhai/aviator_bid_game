const redis = require("../config/redis");
const { REDIS_KEYS } = require("../constants/redisKeys");

const { GAME_STATE, handleCashout, generate6Digit, getCrashMultiplier, rotateGameBets, getClientSeeds, addUserBet, removeUserBet } = require("../games/aviator");
const crypto = require("crypto");

async function startGameRound(serverSeed, order_id) {
  const clientSeeds = await getClientSeeds();
  console.log("clientSeed-server:", clientSeeds);

  const crashMultiplier = getCrashMultiplier(
    serverSeed,
    clientSeeds,
    order_id
  );
  startFlying(crashMultiplier);
}


module.exports = function (wsServer) {
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
      REDIS_KEYS.AVIATOR_GAME_STATE,
      REDIS_KEYS.GAME_ORDER_ID,
      REDIS_KEYS.AVIATOR_MULTIPLIER,
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
            REDIS_KEYS.CURRENT_GAME_BETS_HASH,
            REDIS_KEYS.CURRENT_GAME_TOTAL_BETS
          );
          if (isbetsAdd) {
            console.log("Bet added to current game");
          } else {
            console.log("Bet already placed for current game");
          }
        } else {
          let isbetsAdd = addUserBet(
            msg,
            REDIS_KEYS.NEXT_GAME_BETS_HASH,
            REDIS_KEYS.NEXT_GAME_TOTAL_BETS
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
            REDIS_KEYS.CURRENT_GAME_BETS_HASH,
            REDIS_KEYS.CURRENT_GAME_TOTAL_BETS
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
            REDIS_KEYS.NEXT_GAME_BETS_HASH,
            REDIS_KEYS.NEXT_GAME_TOTAL_BETS
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
    console.log("gameState : ", gameState);
    broadcast({
      event: "aviator_state",
      state: gameState,
      timer: waitTimer,
    });
    waitTimer = 20;
    let order_id = generate6Digit();
    const serverSeed = crypto.randomBytes(32).toString("hex");
    // ✅ store order_id
    await redis.set(REDIS_KEYS.GAME_ORDER_ID, order_id);

    await rotateGameBets();

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
        (async () => {
          const clientSeeds = await getClientSeeds();
          console.log("clientSeed-server:", clientSeeds);

          const crashMultiplier = getCrashMultiplier(
            serverSeed,
            clientSeeds,
            order_id
          );
          console.log("crashMultiplier :: " , crashMultiplier);
          startFlying(crashMultiplier);
        })().catch(console.error);
      }
    }, 1000);
  }

  /* ================= FLYING STATE ================= */
  function startFlying(crashMultiplier) {
    gameState = GAME_STATE.RUNNING;
    multiplier = 1.0;
    console.log("gameState : ", gameState);
    // 🎯 SERVER SIDE CRASH POINT
    // crashPoint = generateCrashPoint();

    broadcast({
      event: "aviator_state",
      state: gameState,
    });

    // 🕐 FORCE CRASH AFTER 1 MINUTE (ONCE)
    // crashTimeout = setTimeout(() => {
    //   crashPlane();
    // }, 60000);

    flyInterval = setInterval(async () => {
      // multiplier += 0.01;
      multiplier *= 1.01;

      multiplier = Number(multiplier.toFixed(2));

      // ✅ store ONLY multiplier
      await redis.set(REDIS_KEYS.AVIATOR_MULTIPLIER, multiplier);
      //  const payload = await buildImaginaryPayload();

      broadcast({
        event: "aviator_tick",
        multiplier: Number(multiplier.toFixed(2)),
      });

      if (multiplier >= crashMultiplier) {
        crashPlane();
      }
    }, 100);
  }

  /* ================= CRASH STATE ================= */
  async function crashPlane() {
    clearInterval(flyInterval);
    // clearTimeout(crashTimeout);

    gameState = GAME_STATE.CRASHED;
    multiplier = 1.0;
    console.log("gameState : ", gameState);
    await redis.set(REDIS_KEYS.AVIATOR_MULTIPLIER, multiplier);

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

    // ⏳ wait 5 seconds then restart
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

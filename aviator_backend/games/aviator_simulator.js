const crypto = require("crypto");

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Correct Aviator crash formula
function getCrashMultiplier(serverSeed, nonce, houseEdge = 0.03) {
  const hash = sha256(serverSeed + nonce);
  const h = parseInt(hash.substring(0, 8), 16);
  const p = h / 2 ** 32;

  return Math.max(1, (1 - houseEdge) / p);
}

function simulateRound(players, serverSeed, nonce) {
  const crashMultiplier = getCrashMultiplier(serverSeed, nonce);

  console.log("\n================ NEW ROUND ================");
  console.log("Crash Multiplier :", crashMultiplier.toFixed(2), "x");

  let houseProfit = 0;

  players.forEach((player, index) => {
    const cashoutAt = player.autoCashout;
    const betAmount = player.betAmount;

    let playerResult;

    if (crashMultiplier >= cashoutAt) {
      // player wins
      const payout = betAmount * cashoutAt;
      const profitPaid = payout - betAmount;

      houseProfit -= profitPaid;
      playerResult = `WIN (+${profitPaid.toFixed(2)})`;
    } else {
      // player loses
      houseProfit += betAmount;
      playerResult = `LOSE (-${betAmount.toFixed(2)})`;
    }

    // ✅ Per-user log
    console.log(
      `Player #${index + 1} | Bet: ₹${betAmount} | Cashout: ${cashoutAt}x | Crash: ${crashMultiplier.toFixed(2)}x | ${playerResult}`
    );
  });

  console.log("------------------------------------------");
  console.log("Round House Profit:", houseProfit.toFixed(2));
  console.log("==========================================\n");

  return {
    crashMultiplier,
    houseProfit,
  };
}

function simulateGame({
  rounds = 100000,
  playersPerRound = 50,
  betAmount = 100,
}) {
  console.log("GAme STart");

  let totalProfit = 0;
  const serverSeed = crypto.randomBytes(32).toString("hex");

  for (let i = 1; i <= rounds; i++) {
    const players = [];

    for (let p = 0; p < playersPerRound; p++) {
      players.push({
        autoCashout: Number((1 + Math.pow(Math.random(), 2) * 9).toFixed(2)),
        betAmount: Math.floor(Math.random() * 100) + 1, // ₹1–₹100
      });
    }

    const { houseProfit } = simulateRound(
      players,
      betAmount,
      serverSeed,
      i
    );

    totalProfit += houseProfit;

    if (i % 1 === 0) {
      console.log(
        `Rounds: ${i}, Total Profit: ₹${totalProfit.toFixed(2)}`
      );
    }
  }

  console.log("\nFINAL RESULT");
  console.log("Rounds:", rounds);
  console.log("House Profit:", totalProfit.toFixed(2));
}



module.exports = {
  getCrashMultiplier,
  simulateRound,
  simulateGame,
};
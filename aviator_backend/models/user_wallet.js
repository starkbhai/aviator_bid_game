const mongoose = require("mongoose");

const userWalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    naka_token: {
      type: Number,
    },
    type: {
      type: String,
      default: null,
    },
    wallet: {
      type: String,
      trim: true
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

module.exports = mongoose.model("user_wallet", userWalletSchema);

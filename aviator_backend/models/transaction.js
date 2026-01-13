const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    winningAmount: {
      type: Number,
    },
    withDrawFees: {
      type: Number,
    },
    transactionId: {
      type: String,
      unique : true
    },
    type: {
      type: String,
    },
    naka_token: {
      type: Number,
    },
    order_number: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Expired"],
      default: "Pending",
    },
    reason: {
      type: String,
    },
    wallet_address: {
      type: String,
    },
    userWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user_wallet",
    },
    level:{
      type:String
    },
    gameType: {
      type: String
    },
    level_id:{ type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("transaction", transactionSchema);

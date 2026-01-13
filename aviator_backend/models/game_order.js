const mongoose = require("mongoose");

const game_orderSchema = new mongoose.Schema(
  {
    price: {
      type: String,
    },
    result_color: {
      type: Array,
    },
    count: {
      type: Number,
    },
    result_number: {
      type: String,
    },
    result_predection_type: {
      type: String,
    },
    date: {
      type: String,
    },
    timeDuration: {
      type: String,
    },
    timeDurationLeft: {
      type: String,
    },
    gameType: {
      type: String,
    },
    status: {
      type: String,
      default:"Pending"
    },
    timerSeconds: {
      type: Number,
      trim: true,
      default : 60
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("game_order", game_orderSchema);

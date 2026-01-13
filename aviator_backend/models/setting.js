const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    token_price: {
      type: Number,
      trim: true
    },
    userCount: {
      type: Number,
      default : 0,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);
module.exports = Setting;

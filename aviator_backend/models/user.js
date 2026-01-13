const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    wallet: {
      type: String,
      required: [true, "Wallet address is required"],
      trim: true,
      unique: true,
      lowercase:true
    },
    parentId: {
      type: String,
      trim: true,
    },
    token: {
      type: String,
      trim: true,
    },
    registerId: {
      type: String,
      trim: true,
      unique: true,
      required: [true, "Register ID is required"],
    },
    levelStr: {
      type: [String], // Explicit type for arrays
      default: []
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0.0,
    },
    // tpin: {
    //   type: Number,
    //   trim: true,
    //   required: [true, "TPIN is required"],
    //   minLength: [6, "TPIN must be 6 digits"],
    //   maxLength: [6, "TPIN must be 6 digits"],
    //   match: [/^\d{6}$/, "TPIN must contain only numbers"], // Ensures only numbers
    // },
    isActive: {
      type: Boolean,
      default: false
    },
    total_referral: {
      type: Number,
      trim: true,
    },
    firstDeposit: {
      type: Boolean,
      default: false
    },

    nickName: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;

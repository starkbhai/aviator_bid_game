const { text } = require("express");
const mongoose = require("mongoose");

const user_bidsSchema = new mongoose.Schema({
  color: {
    type: String,
    default : null,
    lowercase : true
  },
  number: {
    type: Number,
    default : null
  },
  predection_type: {
    type: String,
    default : null,
    lowercase : true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  amount: {
    type: Number,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  gameStatus: {
    type: String,
    default: "Started",
  },
  gameType: {
    type: String,
  },
  count: {
    type: Number,
  },
  orderId:{
    type:Number
  },
  result: {
    type: String,
  },
  result: {
    type: String,
  },
  result: {
    type: String,
  },
  resultAmount: {
    type: String,
  },
  resultNumber: {
    type: String,
  },
  resultColor: {
    type: [],
  },
  
});

module.exports = mongoose.model("user_bids", user_bidsSchema);

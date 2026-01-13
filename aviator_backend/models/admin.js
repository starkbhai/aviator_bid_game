const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(  {
    email: {
      type: String,
    },
    name: {
      type: String,
    },
    password: {
      type: String,
    },
    isDeleted:{
      type:Boolean,
      default:false
    },
  }, { timestamps: true }
);

const User = mongoose.model("Admin", adminSchema);
module.exports = User;

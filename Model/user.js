const mongoose = require("mongoose");
const HomeCleaningDB = require("../dbconfig/HomeCleaningDB");
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    phoneType:{ type: String, required: true },
    email: { type: String, required: true, unique: true },
    ConfurmWhatsAppMobileNumber: { type: Number, unique: true },
    mobileNumber: { type: Number, required: true, unique: true },
    countryCode: { type: String, default: "+91" },
    location: { type: String, required: true },
    pincode: { type: String, required: true },
    token:{ type: String, required: true },
    orderHistory: { type: Object, },

  },
  { timestamps: true }
);


module.exports= HomeCleaningDB.model("User", userSchema);

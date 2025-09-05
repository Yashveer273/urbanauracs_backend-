// models/Coupon.js
const mongoose = require("mongoose");
const HomeCleaningDB = require("../dbconfig/HomeCleaningDB");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // e.g. WINTERS4000
  discount: { type: Number, required: true }, // flat discount OR % discount
  type: { type: String, enum: ["flat", "percent"], default: "flat" }, // support both
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }, // expiry date
});

module.exports = HomeCleaningDB.model("Coupon", couponSchema);

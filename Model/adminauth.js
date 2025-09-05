const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const HomeCleaningDB = require("../dbconfig/HomeCleaningDB");
const AdminAuthSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },   // user id
  pass: { type: String, required: true },               // password (hashed)
  tagAccess: { type: String, default: "viewer" },
   token: { type: String }        // role/access
});

// hash password before save
AdminAuthSchema.pre("save", async function (next) {
  if (!this.isModified("pass")) return next();
  this.pass = await bcrypt.hash(this.pass, 10);
  next();
});

module.exports = HomeCleaningDB.model("adminAuth", AdminAuthSchema);

// models/Sales.js
const mongoose = require("mongoose");
const HomeCleaningDB = require("../dbconfig/HomeCleaningDB");

const salesSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    S_orderId: { type: Number, required: true, index: true },
    date_time: { type: Date }, // Firestore stores as ISO string, Mongoose can parse Date
    email: { type: String },
    name: { type: String },
    phone_number: { type: String },
    product_info: { type: Object }, 
    payableAmount: { type: Number },  
    payedAmount: { type: Number },
    total_price: { type: String },
    user_location: { type: String },
    data: { type: Object }, 
  },
  { timestamps: true }
);


salesSchema.index({ orderId: 1, email: 1 });

const SalesCollection = HomeCleaningDB.model("SalesDB", salesSchema);
module.exports = SalesCollection;

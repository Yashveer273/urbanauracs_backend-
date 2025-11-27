const mongoose = require("mongoose");
const HomeCleaningDB = require("../dbconfig/HomeCleaningDB");

const transactionSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, index: true },
    merchantId: { type: String, index: true },
    merchantTransactionId: { type: String, unique: true },
    customerName: { type: String },
    mobileNumber: { type: String },
    total_price:{ type: String },
    oGtotal_price:{ type: String },
    payableAmount: { type: Number },
    payedAmount: { type: Number },
    status: { type: String },
    data: { type: Object },
  },
  { timestamps: true }
);

// Compound index for frequent queries
transactionSchema.index({ merchantId: 1, orderId: 1 });

const PaymentTransactionCollection = HomeCleaningDB.model(
  "TransactionDB",
  transactionSchema
);

module.exports = PaymentTransactionCollection;

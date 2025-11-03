const mongoose = require("mongoose");
const HomeCleaningDB = require("../dbconfig/HomeCleaningDB");

const vendorSchema = new mongoose.Schema(
  {
    vendorPhoneNo: { type: Number,default: null },
    vendorLocation: { type: String, },
    vendorName: { type: String,  },
    vendorImage: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    reviews: { type: String, default: "" },
  },
  { timestamps: true }
);



module.exports= HomeCleaningDB.model("Vendor", vendorSchema);
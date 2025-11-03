const express = require("express");
const router = express.Router();
const Vendor = require("../Model/vanderModel.js");

/**
 * 🟢 CREATE Vendor
 */
router.post("/create", async (req, res) => {
  try {
    const {vendorPhoneNo,vendorLocation,  vendorName, vendorImage, rating, reviews } = req.body;

    if ( !vendorName) {
      return res.status(400).json({ success: false, message: "_id and vendorName are required" });
    }
  
    const vendor = await Vendor.create({vendorPhoneNo,vendorLocation,  vendorName, vendorImage, rating, reviews });
    res.status(201).json({ success: true, message: "Vendor created successfully", data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating vendor", error: error.message });
  }
});

/**
 * 🟡 READ All Vendors
 */
router.get("/", async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching vendors", error: error.message });
  }
});

/**
 * 🔵 READ One Vendor by ID
 */
router.get("/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const vendor = await Vendor.findOne( {_id} );

    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching vendor", error: error.message });
  }
});

/**
 * 🟣 UPDATE Vendor
 */
router.put("/update/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const updateData = req.body;
console.log(_id)
    const updatedVendor = await Vendor.findOneAndUpdate(
       {_id} ,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedVendor)
      return res.status(404).json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, message: "Vendor updated successfully", data: updatedVendor });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating vendor", error: error.message });
  }
});

/**
 * 🔴 DELETE Vendor
 */
router.delete("/delete/:_id", async (req, res) => {
  try {
    const { _id } = req.params;
    const deletedVendor = await Vendor.findOneAndDelete( {_id} );

    if (!deletedVendor)
      return res.status(404).json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting vendor", error: error.message });
  }
});

module.exports = router;

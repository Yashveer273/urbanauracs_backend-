const mongoose = require("mongoose");
const Sale = require("../Model/sales");
const User = require("../Model/user");

const updateSalesItem = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { product_purchase_id, updates,userId } = req.body;

    if (!product_purchase_id || !updates) {
      return res.status(400).json({ success: false, message: "Missing product_purchase_id or updates" });
    }

    // Try to find sale by ObjectId or orderId
    const query = mongoose.Types.ObjectId.isValid(saleId)
      ? { _id: saleId, "product_info.cart.product_purchase_id": product_purchase_id }
      : { orderId: saleId, "product_info.cart.product_purchase_id": product_purchase_id };

    // Flatten update keys for MongoDB dot notation
    const updateFields = {};
    for (const key in updates) {
      updateFields[`product_info.cart.$.${key}`] = updates[key];
    }

    // Direct update using positional operator
    const updatedSale = await Sale.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ success: false, message: "Sale or cart item not found" });
    }
   
    // --- Update User's orderHistory.cart ---
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        "orderHistory.orderId": saleId,
        "orderHistory.product_info.cart.product_purchase_id": product_purchase_id,
      },
      {
        $set: Object.fromEntries(
          Object.entries(updates).map(([key, val]) => [
            `orderHistory.$[order].product_info.cart.$[cart].${key}`,
            val,
          ])
        ),
      },
      {
        arrayFilters: [
          { "order.orderId": saleId },
          { "cart.product_purchase_id": product_purchase_id },
        ],
        new: true,
      }
    );

    if (!user) {
      console.warn("⚠️ User cart item not found or not updated.");
    }
    return res.json({
      success: true,
      message: "Cart item updated successfully",
      sale: updatedSale,
    });
  } catch (err) {
    console.error("❌ Error in updateSalesItem:", err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = { updateSalesItem };

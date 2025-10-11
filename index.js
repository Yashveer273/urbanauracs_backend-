const express = require("express");

const User=  require("./Model/user");
const crypto = require("crypto");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { firestore } = require("./firebasecon"); // Correct import
const {
  collection,
  addDoc,
  updateDoc,
  setDoc,
  doc,
} = require("firebase/firestore");
const PaymentTransactionCollection = require("./Model/Transection");
const SalesCollection = require("./Model/sales");
const adminAuth = require("./Model/adminauth");
const jwt = require("jsonwebtoken");
const app = express();
const Coupon = require("./Model/coupencode");
app.use(express.json());
app.use(cors());
const path = require("path");
const fs = require("fs");

const bcrypt = require("bcrypt");
// Merchant config
const MERCHANT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const MERCHANT_ID = "PGTESTPAYUAT86";
const MERCHANT_BASE_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
const MERCHANT_STATUS_URL =
  "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status";

const redirectUrl = "http://localhost:8000/redirect";
const successUrl = "http://localhost:5173/PaymentGateway/PaymentSuccess";
const failureUrl = "http://localhost:5173/PaymentGateway/PaymentFailed";
const statusUrl = "http://localhost:5173/PaymentGateway/PaymentStatus";

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");
const https = require("https");
// ✅ WhatsApp API Key
const DV_API_KEY = "f6232282-6c5d-44e7-968c-b5a9a9ad039c";


const upload = multer();
const mediaDir = path.join(__dirname, "media");
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);
app.use("/media", express.static(mediaDir));
cloudinary.config({
  cloud_name: "dj5rxewfw",
  api_key: "638218892496367",
  api_secret: "bgoR2K04MY8CEugd8I1pVeCYQdQ",
});
app.post("/upload-invoice", upload.single("file"), async (req, res) => {
    const{userId}= req.query;
     const {  images, video, pdf } = req.body;
    console.log(userId);
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (req.file.mimetype !== "application/pdf")
      return res.status(400).json({ error: "Only PDF files are allowed" });

    // Ensure media folder exists
    const mediaDir = path.join(__dirname, "media");
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir);
   
    // Save PDF to media folder
    const filePath = path.join(mediaDir, req.file.originalname);
    fs.writeFileSync(filePath, req.file.buffer);
    const msg=`Hi we are from Urban Aura \nYour Invoice: http://localhost:8000/media/${req.file.originalname}`

    const data = await sendWhatsAppMessage( 8218326519, msg, images, video, pdf );

    res.json({
      message: "File saved locally",
      url: ` http://localhost:8000/media/${req.file.originalname}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// app.post("/upload-invoice", upload.single("file"), async (req, res) => {
//   const{userId}= req.query;
//   console.log("kkkkk")
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });
//     if (req.file.mimetype !== "application/pdf")
//       return res.status(400).json({ error: "Only PDF files are allowed" });

//     // Save PDF temporarily
//     const tempPath = path.join(__dirname, `${req.file.originalname}`);
//     fs.writeFileSync(tempPath, req.file.buffer);

//     // Upload to Cloudinary as raw
//     cloudinary.uploader.upload(
//       tempPath,
//       { resource_type: "raw", folder: "invoices" },
//       (err, result) => {
//         fs.unlinkSync(tempPath);

//         if (err) return res.status(500).json({ error: err.message });
//         res.json({ url: result.secure_url, });
//       }
//     );
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// ---------------- CREATE ORDER ----------------
app.post("/create-order", async (req, res) => {

  const { name, mobileNumber, amount, date } = req.body;
  const orderId = `TXN_${mobileNumber}_${date}`;

  const paymentPayload = {
    merchantId: MERCHANT_ID,
    merchantUserId: name,
    mobileNumber: mobileNumber,
    amount: amount * 100,
    merchantTransactionId: orderId,
    redirectUrl: `${redirectUrl}/?id=${orderId}`,
    redirectMode: "REDIRECT",
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const payload = Buffer.from(JSON.stringify(paymentPayload)).toString(
    "base64"
  );
  const keyIndex = 1;
  const stringToHash = payload + "/pg/v1/pay" + MERCHANT_KEY;
  const checksum =
    crypto.createHash("sha256").update(stringToHash).digest("hex") +
    "###" +
    keyIndex;

  try {
    const response = await axios.post(
      MERCHANT_BASE_URL,
      { request: payload },
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
        },
      }
    );
    const transaction = new PaymentTransactionCollection({
      orderId,
      merchantId: MERCHANT_ID,
      merchantTransactionId: orderId,
      payableAmount: amount,
      customerName: name,
      mobileNumber,
      status: "INITIATED",
    });
    await transaction.save();
console.log(";;");
    res.status(200).json({
      msg: "OK",
      url: response.data.data.instrumentResponse.redirectInfo.url,
      merchantTransactionId: orderId,
    });
  } catch (error) {
    console.error("Error in payment:", error);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// ---------------- REDIRECT HANDLER ----------------
app.all("/redirect", async (req, res) => {
  const merchantTransactionId = req.query.id;

  const keyIndex = 1;
  const string =
    `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + MERCHANT_KEY;
  const sha256 = crypto.createHash("sha256").update(string).digest("hex");
  const checksum = sha256 + "###" + keyIndex;

  try {
    const response = await axios.get(
      `${MERCHANT_STATUS_URL}/${MERCHANT_ID}/${merchantTransactionId}`,
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": MERCHANT_ID,
        },
      }
    );

    const amount = response.data.data.amount / 100;

    await PaymentTransactionCollection.findOneAndUpdate(
      { merchantTransactionId },
      {
        $set: {
          payedAmount: amount,
          data: response.data, // full PhonePe response
          status: response.data.code, // PAYMENT_SUCCESS / PAYMENT_FAILED / PAYMENT_PENDING
        },
      },
      { new: true, upsert: true }
    );
    console.log(response.data.code);
    if (response.data.code === "PAYMENT_SUCCESS") {
      res.redirect(`${successUrl}/${merchantTransactionId}/${amount}`);
    } else if (response.data.code === "PAYMENT_PENDING") {
      res.redirect(`${statusUrl}/${merchantTransactionId}/${amount}`);
    } else {
      res.redirect(`${failureUrl}/${merchantTransactionId}/${amount}`);
    }
  } catch (error) {
    console.error("Error in status check:", error);
    res.redirect(`${failureUrl}/${merchantTransactionId}/0`);
  }
});

app.post("/create-advance-order", async (req, res) => {
  const { name, mobileNumber, amount, date } = req.body;
  const orderId = `TXN_${mobileNumber}_${date}`;
  try {
    const transaction = new PaymentTransactionCollection({
      orderId,
      merchantId: "non",
      merchantTransactionId: orderId,
      payableAmount: amount,
      payedAmount:0,
      customerName: name,
      mobileNumber,
      status: "INITIATED",
      data:{"type":"CoD"}
    });
    await transaction.save();

    res.status(200).json({
      msg: "OK",
      url: `http://localhost:5173/PaymentGateway/PaymentSuccess/${orderId}/${amount}`,
      orderId,
    });
  } catch (error) {
    console.error("Error in payment:", error);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// ---------------- SAVE SALES DATA ----------------
app.post("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const salesData = req.body;
    console.log(req.body);
    // ✅ Safely find last S_orderId
    const lastOrder = await SalesCollection.findOne()
      .sort({ S_orderId: -1 })
      .exec();

    const lastId = lastOrder?.S_orderId || 0;
    const newOrderId = Number.isFinite(lastId) ? lastId + 1 : 1;

    salesData.S_orderId = newOrderId;
salesData.orderId=id;
    // --- Fetch payable and payed amounts from MongoDB ---
    const transaction = await PaymentTransactionCollection.findOne({
      merchantTransactionId: id,
    });
    if (transaction) {
      salesData.payableAmount = transaction.payableAmount;
      salesData.payedAmount = transaction.payedAmount??0;
    }

    // --- Save to Firestore ---
    const docRef = doc(firestore, "sales", id);
    await setDoc(docRef, salesData);
    console.log(`✅ Sales data for order ID ${id} saved to Firestore.`);

    // --- Save to MongoDB ---
    const salesDoc = new SalesCollection(salesData);

    await salesDoc.save();
    console.log(`✅ Sales data for order ID ${id} saved to MongoDB.`);
 const mobileNumber =
  
     Number(salesData.phone_number)

const orderData = {
      orderId: salesData.orderId,
      total_price: salesData.total_price || 0,
      payableAmount:salesData.payableAmount,
      oGtotal_price:salesData.oGtotal_price,
      product_info:salesData.product_info,
      status: salesData.status,
      date_time: salesData.date_time 
    };
const user = await User.findOneAndUpdate(
      { mobileNumber },
      { $push: { orderHistory: orderData } },
      { new: true } // return updated document
    );
console.log(orderData);
    return res.status(200).json({
      message: "Sales data saved successfully in Firestore & MongoDB",
    });
  } catch (e) {
    console.error("❌ Error saving sales data:", e);
    return res.status(500).json({ error: "Server Error", details: e });
  }
});


app.post("/api/sales/addNewItemInCart", async (req, res) => {
  // 1. Destructure the required data from the request body
  const { S_orderId, newCartItem } = req.body;

  // 2. Input validation
  if (!S_orderId || !newCartItem) {
    return res.status(400).json({
      success: false,
      message: "Missing S_orderId or newCartItem in request body.",
    });
  }

  try {
    const updatedDoc = await SalesCollection.findOneAndUpdate(
      { S_orderId: S_orderId },
      { $push: { "product_info.cart": newCartItem } },
      { new: true }
    );
    if (!updatedDoc) {
      console.log("No document found with S_orderId:", S_orderId);
      return res.status(404).json({
        success: false,
        message: `Order with ID ${S_orderId} not found.`,
      });
    }
    const docRef = doc(firestore, "sales", S_orderId);
    await updateDoc(docRef, {
      "product_info.cart": arrayUnion(newCartItem),
    });
    return res.status(200).json({
      success: true,
      message: "Item successfully added to cart.",
      cart: updatedDoc.product_info.cart, // Return the full updated cart
      updatedOrder: updatedDoc,
    });
  } catch (error) {
    // 6. Handle any database or server errors
    console.error("Error adding item to cart:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred.",
      error: error.message,
    });
  }
});
app.post("/api/create-dashAuth", async (req, res) => {
  try {
    const { id, pass, tagAccess } = req.body;

    // create new user
    const user = new adminAuth({ id, pass, tagAccess });

    // generate jwt
    const token = jwt.sign(
      { id: user._id, role: user.tagAccess },
      "SECRET_KEY", // use env var in real project
      { expiresIn: "1d" }
    );

    user.token = token;
    await user.save();

    res.json({
      message: "Account created successfully",
      user: {
        id: user.id,
        tagAccess: user.tagAccess,
        token: user.token,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
app.delete("/api/delete-dashAuth/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await adminAuth.findOneAndDelete({ id });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully", deletedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Get all users
app.get("/api/get-dashAuth", async (req, res) => {
  try {
    const users = await adminAuth.find({}, { pass: 0 }); // hide password
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user tags (access control)
app.put("/api/update-dashAuth/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const user = await adminAuth.findOneAndUpdate(
      { id },
      { tagAccess: tags },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Tags updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login-dashAuth", async (req, res) => {
  try {
    const { id, pass } = req.body;

    const user = await adminAuth.findOne({ id });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // bcrypt password check
    const isMatch = await bcrypt.compare(pass, user.pass);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // JWT token
    const token = jwt.sign(
      { id: user.id, tagAccess: user.tagAccess },
      "SECRET_KEY",
      { expiresIn: "1d" }
    );

    // save token in DB
    user.token = token;
    await user.save();

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        tagAccess: user.tagAccess, // ✅ send role also
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post("/Create/discountCoupen", async (req, res) => {
  try {
    const { code, discount, type, expiresAt } = req.body;

    const coupon = new Coupon({
      code,
      discount,
      type,
      expiresAt,
    });

    await coupon.save();
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
app.get("/api/coupons/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const coupon = await Coupon.findOne({ code });

    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    // Check expiry
    if (new Date() > coupon.expiresAt) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon expired" });
    }

    res.json({ success: true, coupon });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
app.get("/api/Allcoupons", async (req, res) => {
  try {
    const coupons = await Coupon.find();

    res.json({ success: true, coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
app.delete("/api/deleteCoupon/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Coupon.findByIdAndDelete(id);

    if (!deleted) {
      return res.json({ success: false, message: "Coupon not found" });
    }

    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST API
app.post("/send-whatsapp", async (req, res) => {
  try {
    const { mobileNumber, msg, images, video, pdf,type } = req.body;

    // ✅ Validation
    if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, error: "Invalid mobile number" });
    }
    if (!msg) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    // const result = await sendWhatsAppMessage(mobileNumber, msg, images, video, pdf);

   if(type==="Login") {
const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Generate new JWT token
    const token = user.token;
     res.status(200).json({ success: true,data:msg,token});
   }else{ res.status(200).json({ success: true,data:  msg});}
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
// ---------------- WHATSAPP MESSAGE API ----------------
// app.post("/send-whatsapp", async (req, res) => {
//   try {
//     const { number, messageBody, images, video, pdf } = req.body;

//     if (!number || !messageBody) {
//       return res.status(400).json({ success: false, message: "number and messageBody are required" });
//     }

//     const url = "https://157.90.210.179/api/send-message";
//     console.log("🔗 Sending WhatsApp to:", number);

//     const response = await axios.get(url, {
//       httpsAgent: new https.Agent({ rejectUnauthorized: false }),
//       headers: { "api-key": DV_API_KEY },
//       params: { "api-key": DV_API_KEY, number, messageBody, images, video, pdf },
//     });

//     console.log("🟢 WhatsApp API Response:", response.data);
//     res.json({ success: true, data: response.data });
//   } catch (error) {
//     console.error("❌ WhatsApp API Error:", error.response?.data || error.message);
//     res.status(500).json({
//       success: false,
//       message: "Failed to send WhatsApp message",
//       error: error.response?.data || error.message,
//     });
//   }
// });

  /* ---------------- Utils ---------------- */
 
 async function sendWhatsAppMessage( number, messageBody, images, video, pdf ) {
  if (!number || !messageBody) {
    throw new Error("number and messageBody are required");
  }

  // Ensure number is a string
  const phoneNumber = String(number);

  const url = "https://157.90.210.179/api/send-message";
  console.log("🔗 Sending WhatsApp to:", phoneNumber);

  const response = await axios.get(url, {
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    headers: { "api-key": DV_API_KEY },
    params: { "api-key": DV_API_KEY, number: phoneNumber, messageBody },
  });

  console.log("🟢 WhatsApp API Response:", response.data);
  return response.data;
}

const SECRET_KEY = process.env.JWT_SECRET || "mysecretkey";


// ✅ Registration API
app.post("/register", async (req, res) => {
  try {
    const { username, email, mobileNumber, countryCode, location, pincode } = req.body;

    if (!username || !email || !mobileNumber || !location || !pincode) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: "Invalid Indian mobile number." });
    }

    // ✅ Fast lookup for either duplicate email or mobile
    const existingUser = await User.findOne({
      $or: [{ email }, { mobileNumber }]
    }).select("email mobileNumber");

    if (existingUser) {
      const conflictField =
        existingUser.email === email
          ? "email"
          : "mobile number";
      return res.status(400).json({
        success: false,
        message: `This ${conflictField} is already registered.`,
      });
    }

    // ✅ Fast token (no need to query DB)
    const token = jwt.sign(
      { mobileNumber, time: Date.now() },
      SECRET_KEY,
      { expiresIn: "10d" }
    );

    // ✅ Minimal write load
    const newUser = await User.create({
      username,
      email,
      mobileNumber,
      countryCode,
      location,
      pincode,
      token,
      orderHistory: [],
    });

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      token,
      data: newUser,
    });
  } catch (err) {
    // ✅ Handle duplicate key gracefully (fallback safety)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered.`,
      });
    }

    console.error("Registration error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});


// ✅ 2️⃣ Login API (using mobile number)
app.post("/login", async (req, res) => {
  try {
    const { mobileNumber, token} = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ success: false, message: "Mobile number is required." });
    }

    // Validate format
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ success: false, message: "Invalid 10-digit mobile number." });
    }

    // Check if user already exists
    const user = await User.findOne({ mobileNumber });

  

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
if(user.token==token){
    // Generate new JWT token
    const token = jwt.sign({ id: user._id, mobileNumber }, SECRET_KEY, { expiresIn: "10d" });

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user,
    });}else{ res.status(404).json({ success: false, message: "User not found." });}
   
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error during login." });
  }
});


// ✅ 3️⃣ Token Verification API
app.post("/verify-token", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required." });
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired token." });
      }

      res.json({ success: true, message: "Token is valid.", data: decoded });
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ success: false, message: "Server error verifying token." });
  }
});

app.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import { generateOTP, saveOTP, verifyOTP, getOTPForTesting } from "./utils/otpStore.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import Razorpay from "razorpay";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use("/uploads", express.static("uploads"));

// Razorpay Instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "placeholder_secret",
});

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASS || "your-app-password",
  },
  debug: true,
  logger: true
});

// Configure Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: "No file uploaded" });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  res.status(200).send({ url: fileUrl });
});

// IST Time Helper
const getISTTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(utc + istOffset);
};

// Subscription Plan Limits (Per Day)
const PLAN_LIMITS = {
  Free: 1,
  Bronze: 3,
  Silver: 5,
  Gold: Infinity,
};

// Pricing in INR (Paise for Razorpay)
const PLAN_PRICES = {
  Bronze: 100 * 100, // ₹100
  Silver: 300 * 100, // ₹300
  Gold: 1000 * 100, // ₹1000
};

app.get("/", (req, res) => {
  res.send("Twiller backend is running successfully");
});

const port = process.env.PORT || 5000;
const url = process.env.MONGODB_URL;

mongoose
  .connect(url)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

//Register
//Register
app.post("/register", async (req, res) => {
  try {
    console.log("Register endpoint called");
    console.log("Request body:", req.body);
    const existinguser = await User.findOne({ email: req.body.email });
    if (existinguser) {
      console.log("User found:", existinguser);
      return res.status(200).send(existinguser);
    }
    console.log("Creating new user");
    const newUser = new User(req.body);
    await newUser.save();
    console.log("New user created:", newUser);
    return res.status(201).send(newUser);
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(400).send({ error: error.message });
  }
});
// loggedinuser
app.get("/loggedinuser", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).send({ error: "Email required" });
    }
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }
    return res.status(200).send(user);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Login History and Security (Task 6)
app.post("/login-check", async (req, res) => {
  try {
    const { email, userAgent } = req.body;
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const browserName = result.browser.name;
    const osName = result.os.name;
    const deviceType = result.device.type || "desktop"; // desktop, mobile, tablet
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    console.log(`[LOGIN-CHECK] User: ${email}, Browser: ${browserName}, Device: ${deviceType}, IP: ${ip}`);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    // 1. Mobile Device Time Restriction (10:00 AM - 1:00 PM IST)
    if (deviceType === "mobile") {
      const istTime = getISTTime();
      const hours = istTime.getHours();

      if (hours < 10 || hours >= 13) {
        return res.status(403).send({ error: "Mobile login is only allowed between 10:00 AM and 1:00 PM IST." });
      }
    }

    // 2. Browser-Specific Authentication
    let otpRequired = false;
    if (browserName === "Chrome") {
      otpRequired = true;
      const otp = generateOTP();
      saveOTP(email, otp);

      // Send OTP via email
      if (process.env.EMAIL_USER !== "your-email@gmail.com") {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your Twiller Login Security OTP",
          text: `Your verification code for Chrome login is: ${otp}`,
        };
        transporter.sendMail(mailOptions).catch(err => console.error("[EMAIL] Send error:", err));
      }
      console.log(`[CHROME-SECURITY] Sent OTP ${otp} to ${email}`);
    } else if (browserName === "Edge" || browserName === "IE" || browserName === "Microsoft Edge") {
      otpRequired = false;
      console.log(`[MICROSOFT-SECURITY] Auto-login allowed for ${browserName}`);
    }

    // Record login history immediately for non-OTP logins
    // For OTP logins, we'll record it AFTER successful OTP verification
    if (!otpRequired) {
      await recordLoginHistory(user, result, ip);
    }

    return res.status(200).send({
      otpRequired: otpRequired,
      otp: otpRequired ? getOTPForTesting(email) : null,
      user: otpRequired ? null : user,
      message: otpRequired ? "OTP sent for Chrome verification" : "Login successful"
    });

  } catch (error) {
    console.error("Login Check Error:", error);
    return res.status(500).send({ error: error.message });
  }
});

app.post("/record-login", async (req, res) => {
  try {
    const { email, userAgent } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send({ error: "User not found" });

    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    await recordLoginHistory(user, result, ip);
    res.status(200).send({ message: "Login history recorded", user });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

async function recordLoginHistory(user, uaResult, ip) {
  const historyEntry = {
    timestamp: new Date(),
    browser: uaResult.browser.name || "Unknown",
    os: uaResult.os.name || "Unknown",
    device: uaResult.device.type || "desktop",
    ip: ip
  };
  user.loginHistory.push(historyEntry);
  await user.save();
  console.log(`[HISTORY] Recorded login for ${user.email} from ${historyEntry.browser}/${historyEntry.device}`);
}
// update Profile
app.patch("/userupdate/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const updated = await User.findOneAndUpdate(
      { email },
      { $set: req.body },
      { new: true, upsert: false }
    );
    return res.status(200).send(updated);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// OTP Routes
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send({ error: "Email is required" });

  const otp = generateOTP();
  saveOTP(email, otp);

  // Send real email if configured
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== "your-email@gmail.com") {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Twiller OTP",
      text: `Your verification code is: ${otp}`,
    };
    transporter.sendMail(mailOptions)
      .then(info => console.log(`[EMAIL] Success: ${info.response}`))
      .catch(err => {
        console.error("[EMAIL] Send error:", err);
        import("fs").then(fs => fs.appendFileSync("debug.log", `[EMAIL-ERROR] Failed to send email to ${email}: ${err.message}\n`));
      });
  } else {
    console.warn("[EMAIL] Skipping email send: EMAIL_USER is still set to placeholder or missing.");
    import("fs").then(fs => fs.appendFileSync("debug.log", `[EMAIL-SKIP] Skipped email to ${email} due to config\n`));
  }

  console.log(`Sending OTP ${otp} to ${email}`);
  import("fs").then(fs => fs.appendFileSync("debug.log", `OTP for ${email}: ${otp}\n`));

  res.status(200).send({ message: "OTP sent successfully", otp: otp }); // Return OTP for testing
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  console.log(`[REQ-DEBUG] /verify-otp called with:`, req.body);
  import("fs").then(fs => fs.appendFileSync("debug.log", `[REQ-DEBUG] /verify-otp called with: ${JSON.stringify(req.body)}\n`));
  const isValid = verifyOTP(email, otp);
  if (isValid) {
    res.status(200).send({ message: "OTP verified" });
  } else {
    res.status(400).send({ error: "Invalid or expired OTP" });
  }
});

app.post("/send-language-otp", async (req, res) => {
  const { email, phoneNumber, language } = req.body;
  if (!email) return res.status(400).send({ error: "Email is required" });

  const target = language === "French" ? email : (phoneNumber || email);
  const method = language === "French" ? "Email" : "SMS";

  const otp = generateOTP();
  saveOTP(email, otp);

  // Send real email if target is email, regardless of method (as a fallback)
  const isEmailTarget = target.includes("@");

  if (isEmailTarget) {
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== "your-email@gmail.com") {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: target,
        subject: `Twiller Verification - Switching to ${language}`,
        text: `Your verification code to switch language to ${language} is: ${otp}`,
      };
      console.log(`[EMAIL] Attempting to send OTP email to ${target}...`);
      transporter.sendMail(mailOptions)
        .then(info => console.log(`[EMAIL] Success: ${info.response}`))
        .catch(err => {
          console.error("[EMAIL] Send Error:", err);
          import("fs").then(fs => fs.appendFileSync("debug.log", `[EMAIL-ERROR] Failed to send email to ${target}: ${err.message}\n`));
        });
    } else {
      console.warn("[EMAIL] Skipping email send: EMAIL_USER is still set to placeholder.");
      import("fs").then(fs => fs.appendFileSync("debug.log", `[EMAIL-SKIP] Skipped email to ${target} due to config\n`));
    }
  }

  console.log(`[LANGUAGE-OTP] Sending ${method} OTP ${otp} to ${target} for switching to ${language}`);
  import("fs").then(fs => fs.appendFileSync("debug.log", `[LANGUAGE-OTP] OTP for ${email} (${language} via ${method}): ${otp}\n`));

  res.status(200).send({ message: `OTP sent via ${method}`, otp: otp }); // Return OTP for testing
});

app.post("/verify-language-otp", async (req, res) => {
  const { email, otp, language } = req.body;
  const isValid = verifyOTP(email, otp);
  if (isValid) {
    const langCodeMap = {
      English: "en",
      Spanish: "es",
      Hindi: "hi",
      Portuguese: "pt",
      Chinese: "zh",
      French: "fr"
    };
    const langCode = langCodeMap[language] || "en";
    await User.findOneAndUpdate({ email }, { preferredLanguage: langCode });
    res.status(200).send({ message: "Language updated successfully", langCode });
  } else {
    res.status(400).send({ error: "Invalid or expired OTP" });
  }
});

// Tweet API

// POST request Updated for Audio
app.post("/post", async (req, res) => {
  try {
    const { audio, author } = req.body;

    // Check Tweet Limit (Daily)
    const user = await User.findById(author);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    const plan = user.subscriptionPlan || "Free";
    const limit = PLAN_LIMITS[plan];

    // Get Start of Today in IST
    const istNow = getISTTime();
    const istStartOfToday = new Date(istNow);
    istStartOfToday.setHours(0, 0, 0, 0);

    // Calculate UTC equivalent of IST Start of Today
    const utcStartOfToday = new Date(istStartOfToday.getTime() - (5.5 * 60 * 60 * 1000));

    const tweetCount = await Tweet.countDocuments({
      author: author,
      timestamp: { $gte: utcStartOfToday }
    });

    if (tweetCount >= limit) {
      return res.status(403).send({
        error: `Daily tweet limit reached for ${plan} plan. Your limit is ${limit === Infinity ? 'Unlimited' : limit} tweets per day. Please upgrade your plan to post more.`
      });
    }

    // Time restriction check for audio
    if (audio) {
      const istTime = getISTTime();
      const hours = istTime.getHours();

      // 2:00 PM is 14, 7:00 PM is 19.
      if (hours < 14 || hours >= 19) {
        return res.status(403).send({ error: "Audio tweets are only allowed between 2:00 PM and 7:00 PM IST." });
      }
    }

    const tweet = new Tweet(req.body);
    await tweet.save();
    return res.status(201).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// get all tweet
app.get("/post", async (req, res) => {
  try {
    const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
    return res.status(200).send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
//  LIKE TWEET
app.post("/like/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.likedBy.includes(userId)) {
      tweet.likes += 1;
      tweet.likedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});
// retweet 
app.post("/retweet/:tweetid", async (req, res) => {
  try {
    const { userId } = req.body;
    const tweet = await Tweet.findById(req.params.tweetid);
    if (!tweet.retweetedBy.includes(userId)) {
      tweet.retweets += 1;
      tweet.retweetedBy.push(userId);
      await tweet.save();
    }
    res.send(tweet);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

// Forgot Password
app.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or phone
    if (!identifier) {
      return res.status(400).send({ error: "Email or phone number is required" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phoneNumber: identifier }]
    });

    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    // Check 24-hour restriction
    const now = new Date();
    if (user.lastPasswordResetTime) {
      const diffInHours = (now - new Date(user.lastPasswordResetTime)) / (1000 * 60 * 60);
      if (diffInHours < 24) {
        return res.status(429).send({ error: "You can use this option only one time per day." });
      }
    }

    // Password generator (uppercase and lowercase letters only)
    const generatePassword = () => {
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
      let result = "";
      for (let i = 0; i < 10; i++) {
        result += letters.charAt(Math.floor(Math.random() * letters.length));
      }
      return result;
    };

    const newPassword = generatePassword();
    user.password = newPassword;
    user.lastPasswordResetTime = now;
    await user.save();

    console.log(`Password reset for ${identifier}: ${newPassword}`);

    return res.status(200).send({
      message: "Password reset successful",
      newPassword: newPassword
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).send({ error: error.message });
  }
});

// Subscriptions
app.post("/create-order", async (req, res) => {
  try {
    const { plan, email } = req.body;

    // Time Restriction: 10:00 AM to 11:00 AM IST
    const istTime = getISTTime();
    const hours = istTime.getHours();

    if (hours < 10 || hours >= 11) {
      return res.status(403).send({ error: "Payments are only allowed between 10:00 AM and 11:00 AM IST." });
    }

    if (!PLAN_PRICES[plan]) {
      return res.status(400).send({ error: "Invalid plan selected" });
    }

    const options = {
      amount: PLAN_PRICES[plan],
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).send(order);
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email, plan } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "placeholder_secret")
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // Update User Plan
      await User.findOneAndUpdate({ email }, { subscriptionPlan: plan });

      // Send Email Invoice (HTML)
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Subscription Confirmation - ${plan} Plan`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1DA1F2; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #1DA1F2; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Twiller Premium</h1>
          </div>
          <div style="padding: 30px; background-color: #000; color: #fff;">
            <h2 style="color: #1DA1F2;">Thank you for subscribing!</h2>
            <p>You have successfully upgraded to the <strong>${plan} Plan</strong>.</p>
            
            <div style="background-color: #15181c; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #333;">
              <h3 style="margin-top: 0; border-bottom: 1px solid #333; padding-bottom: 10px;">Invoice Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #71767b;">Order ID:</td>
                  <td style="padding: 8px 0; text-align: right;">${razorpay_order_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71767b;">Payment ID:</td>
                  <td style="padding: 8px 0; text-align: right;">${razorpay_payment_id}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71767b;">Plan:</td>
                  <td style="padding: 8px 0; text-align: right; color: #1DA1F2; font-weight: bold;">${plan}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #71767b;">Amount Paid:</td>
                  <td style="padding: 8px 0; text-align: right; font-size: 1.2em; font-weight: bold;">₹${PLAN_PRICES[plan] / 100}</td>
                </tr>
              </table>
            </div>
            
            <p>Your new limit is <strong>${PLAN_LIMITS[plan] === Infinity ? 'Unlimited' : PLAN_LIMITS[plan]} tweets per day</strong>.</p>
            <p>Enjoy your premium experience on Twiller!</p>
          </div>
          <div style="background-color: #15181c; padding: 20px; text-align: center; font-size: 12px; color: #71767b; border-top: 1px solid #333;">
            © ${new Date().getFullYear()} Twiller Inc. All rights reserved.
          </div>
        </div>
        `,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email Error:", error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });

      res.status(200).send({ message: "Subscription successful" });
    } else {
      res.status(400).send({ error: "Invalid payment signature" });
    }
  } catch (error) {
    console.error("Verify Payment Error:", error);
    res.status(500).send({ error: error.message });
  }
});
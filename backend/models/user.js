import mongoose from "mongoose";
const UserSchema = mongoose.Schema({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  avatar: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phoneNumber: { type: String, unique: true, sparse: true },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  website: { type: String, default: "" },
  joinedDate: { type: Date, default: Date.now() },
  notificationsEnabled: { type: Boolean, default: false },
  lastPasswordResetTime: { type: Date },
  subscriptionPlan: { type: String, enum: ["Free", "Bronze", "Silver", "Gold"], default: "Free" },
  preferredLanguage: { type: String, default: "en" },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    browser: String,
    os: String,
    device: String,
    ip: String,
  }],
});

export default mongoose.model("User", UserSchema);

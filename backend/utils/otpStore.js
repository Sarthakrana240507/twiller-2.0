
// In-memory store for OTPs: email -> { otp, expires }
const otpStore = new Map();

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

export const saveOTP = (email, otp) => {
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes
    otpStore.set(email, { otp, expires });
    console.log(`[OTP-DEBUG] Generated OTP for ${email}: ${otp}`); // Log for dev testing
};

export const verifyOTP = (email, otp) => {
    const record = otpStore.get(email);
    if (!record) return false;

    if (Date.now() > record.expires) {
        otpStore.delete(email);
        return false;
    }

    if (record.otp === otp) {
        otpStore.delete(email);
        return true;
    }
    return false;
};

export const getOTPForTesting = (email) => {
    const record = otpStore.get(email);
    return record ? record.otp : null;
};

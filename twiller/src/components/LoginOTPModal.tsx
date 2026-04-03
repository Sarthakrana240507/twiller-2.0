"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import axiosInstance from "@/lib/axiosInstance";
import { useTranslation } from "react-i18next";

interface LoginOTPModalProps {
    email: string;
    onSuccess: (userData: any) => void;
    onCancel: () => void;
}

export default function LoginOTPModal({ email, onSuccess, onCancel }: LoginOTPModalProps) {
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axiosInstance.post("/verify-otp", { email, otp });
            if (res.data.message === "OTP verified") {
                // Now record the login history on the backend
                const recordRes = await axiosInstance.post("/record-login", {
                    email,
                    userAgent: navigator.userAgent
                });
                onSuccess(recordRes.data.user);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || t("verification_failed"));
        } finally {
            setLoading(false);
        }
    };

    const { t } = useTranslation();

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-black border-gray-800 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">{t("chrome_verification")}</CardTitle>
                    <p className="text-center text-gray-400 text-sm">
                        {t("security_otp_desc", { email })}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4 text-black">
                    <Input
                        placeholder={t("enter_6_digit_otp")}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-gray-900 border-gray-700 text-white"
                        maxLength={6}
                    />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div className="flex space-x-3">
                        <Button variant="outline" className="flex-1 border-gray-700 text-white hover:bg-gray-900" onClick={onCancel}>
                            {t("cancel")}
                        </Button>
                        <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" onClick={handleVerify} disabled={loading || otp.length < 6}>
                            {loading ? t("verifying") : t("verify_login")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

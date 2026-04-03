"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { X } from "lucide-react";
import LoadingSpinner from "./loading-spinner";
import axiosInstance from "@/lib/axiosInstance";
import { useTranslation } from "react-i18next";

interface LanguageOTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: (langCode: string) => void;
    email: string;
    phoneNumber?: string;
    language: string;
}

const LanguageOTPModal: React.FC<LanguageOTPModalProps> = ({
    isOpen,
    onClose,
    onVerified,
    email,
    phoneNumber,
    language,
}) => {
    const { t } = useTranslation();
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const method = language === "French" ? t("email_method") : t("sms_method");

    const handleVerify = async () => {
        if (!otp || otp.length !== 6) {
            setError(t("otp_invalid"));
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await axiosInstance.post("/verify-language-otp", {
                email,
                otp,
                language,
            });

            if (response.data.langCode) {
                onVerified(response.data.langCode);
                onClose();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || t("verification_failed"));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
            <Card className="w-full max-w-md bg-black border-gray-800 text-white">
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800 pb-4">
                    <CardTitle className="text-xl font-bold">{t("verify_otp")}</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-white hover:bg-gray-900"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2 text-center">
                        <p className="text-gray-400">
                            {t("enter_otp", { method })}
                        </p>
                        <p className="font-semibold text-blue-400">
                            {language === "French" ? email : (phoneNumber || email)}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="otp" className="text-white">
                            {t("verify_otp")}
                        </Label>
                        <Input
                            id="otp"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            maxLength={6}
                            className="bg-transparent border-gray-600 text-white text-center text-2xl tracking-widest focus:border-blue-500 h-14"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <Button
                        onClick={handleVerify}
                        className="w-full bg-white text-black hover:bg-gray-200 font-bold h-12 rounded-full"
                        disabled={isLoading || otp.length !== 6}
                    >
                        {isLoading ? <LoadingSpinner size="sm" /> : t("verify")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default LanguageOTPModal;

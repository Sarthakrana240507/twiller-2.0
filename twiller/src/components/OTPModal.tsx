import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { X, Loader2 } from "lucide-react";
import axiosInstance from "@/lib/axiosInstance";
import { useTranslation } from "react-i18next";

interface OTPModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    onVerified: () => void;
}

const OTPModal: React.FC<OTPModalProps> = ({ isOpen, onClose, email, onVerified }) => {
    const [otp, setOtp] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState<"send" | "verify">("send");

    const { t } = useTranslation();

    const handleSendOTP = async () => {
        setIsLoading(true);
        setError("");
        try {
            await axiosInstance.post("/send-otp", { email });
            setStep("verify");
        } catch (err: any) {
            setError(err.response?.data?.error || t("failed_send_otp"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        setIsLoading(true);
        setError("");
        try {
            await axiosInstance.post("/verify-otp", { email, otp });
            onVerified();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || t("invalid_otp"));
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-black border-gray-800 text-white">
                <CardHeader className="relative pb-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">{t("authentication_required")}</CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-white"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <p className="text-gray-400">
                        {t("audio_verify_desc", { email })}
                    </p>

                    {error && (
                        <div className="bg-red-900/20 border border-red-800 rounded p-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {step === "send" ? (
                        <Button
                            className="w-full bg-blue-500 hover:bg-blue-600 rounded-full font-bold h-12"
                            onClick={handleSendOTP}
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                            {t("send_otp")}
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <Input
                                placeholder={t("enter_6_digit_otp")}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="bg-gray-900 border-gray-700 text-white text-center text-xl tracking-widest h-12"
                                maxLength={6}
                            />
                            <Button
                                className="w-full bg-blue-500 hover:bg-blue-600 rounded-full font-bold h-12"
                                onClick={handleVerifyOTP}
                                disabled={isLoading || otp.length < 6}
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                                {t("verify_continue")}
                            </Button>
                            <div className="text-center">
                                <Button variant="link" className="text-blue-400 text-sm" onClick={handleSendOTP}>
                                    {t("resend_otp")}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default OTPModal;

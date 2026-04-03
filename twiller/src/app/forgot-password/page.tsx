"use client";

import React, { useState } from "react";
import { Mail, Phone, ArrowLeft, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TwitterLogo from "@/components/Twitterlogo";
import Link from "next/link";
import axiosInstance from "@/lib/axiosInstance";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
    const { t } = useTranslation();
    const [identifier, setIdentifier] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;

        setIsLoading(true);
        setMessage(null);
        setGeneratedPassword(null);

        try {
            const response = await axiosInstance.post("/forgot-password", { identifier });
            setMessage({ type: "success", text: t("reset_success") });
            setGeneratedPassword(response.data.newPassword);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || t("something_wrong");
            setMessage({ type: "error", text: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="mb-8">
                <TwitterLogo size="xl" className="text-white" />
            </div>

            <Card className="w-full max-w-md bg-black border-gray-800 text-white">
                <CardHeader className="space-y-1">
                    <div className="flex items-center mb-2">
                        <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="h-5 w-5 mr-4" />
                        </Link>
                        <CardTitle className="text-2xl font-bold">{t("forgot_password_title")}</CardTitle>
                    </div>
                    <CardDescription className="text-gray-400">
                        {t("forgot_password_desc")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {!generatedPassword ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="identifier" className="text-white">{t("email_or_phone")}</Label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        {identifier.includes("@") ? <Mail className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                                    </div>
                                    <Input
                                        id="identifier"
                                        type="text"
                                        placeholder={t("enter_email_phone")}
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm flex items-start space-x-2 ${message.type === "success" ? "bg-green-900/20 border border-green-800 text-green-400" : "bg-red-900/20 border border-red-800 text-red-400"
                                    }`}>
                                    {message.type === "success" ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-full text-lg mt-4 transition-colors"
                                disabled={isLoading || !identifier.trim()}
                            >
                                {isLoading ? t("loading") : t("reset_password")}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6 text-center space-y-4">
                                <div className="flex justify-center">
                                    <div className="bg-blue-500 p-3 rounded-full">
                                        <KeyRound className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-gray-300 text-sm">{t("temp_password_is")}</p>
                                    <p className="text-3xl font-mono font-bold text-white tracking-widest bg-black/40 py-2 rounded border border-gray-700">
                                        {generatedPassword}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400">
                                    {t("change_pass_hint")}
                                </p>
                            </div>

                            <div className="flex flex-col space-y-3">
                                <Button
                                    onClick={() => {
                                        const tempInput = document.createElement("input");
                                        tempInput.value = generatedPassword;
                                        document.body.appendChild(tempInput);
                                        tempInput.select();
                                        document.execCommand("copy");
                                        document.body.removeChild(tempInput);
                                        // Add toast or some feedback here if available
                                    }}
                                    variant="outline"
                                    className="w-full border-gray-600 text-white hover:bg-gray-900 rounded-full h-12"
                                >
                                    {t("copy_password")}
                                </Button>
                                <Link href="/" className="w-full">
                                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-full h-12">
                                        {t("back_to_login_link")}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center text-sm">
                        <p className="text-gray-400">
                            {t("remember_password")}{" "}
                            <Link href="/" className="text-blue-400 hover:underline">
                                {t("back_to_login")}
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

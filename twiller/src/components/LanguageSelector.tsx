"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useAuth } from "@/context/AuthContext";
import LanguageOTPModal from "./LanguageOTPModal";
import axiosInstance from "@/lib/axiosInstance";

const languages = [
    { name: "English", code: "en" },
    { name: "Spanish", code: "es" },
    { name: "Hindi", code: "hi" },
    { name: "Portuguese", code: "pt" },
    { name: "Chinese", code: "zh" },
    { name: "French", code: "fr" },
];

const LanguageSelector: React.FC = () => {
    const { i18n, t } = useTranslation();
    const { user } = useAuth();
    const [selectedLang, setSelectedLang] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleLanguageSelect = async (lang: any) => {
        if (lang.code === i18n.language) return;

        setIsSending(true);
        try {
            const res = await axiosInstance.post("/send-language-otp", {
                email: user?.email,
                phoneNumber: user?.phoneNumber,
                language: lang.name,
            });
            setSelectedLang(lang);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to send Language OTP:", error);
            alert(t("failed_send_otp"));
        } finally {
            setIsSending(false);
        }
    };

    const onVerified = (langCode: string) => {
        i18n.changeLanguage(langCode);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center space-x-2 text-white hover:bg-gray-900 w-full justify-start px-4 h-12 rounded-full"
                        disabled={isSending}
                    >
                        <Globe className="h-5 w-5" />
                        <span className="font-semibold">{t("language")}</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black border-gray-800 text-white w-48">
                    {languages.map((lang) => (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleLanguageSelect(lang)}
                            className="flex items-center justify-between hover:bg-gray-900 cursor-pointer"
                        >
                            <span>{lang.name}</span>
                            {i18n.language === lang.code && (
                                <Check className="h-4 w-4 text-blue-500" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {selectedLang && user && (
                <LanguageOTPModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onVerified={onVerified}
                    email={user.email}
                    phoneNumber={user.phoneNumber}
                    language={selectedLang.name}
                />
            )}
        </>
    );
};

export default LanguageSelector;

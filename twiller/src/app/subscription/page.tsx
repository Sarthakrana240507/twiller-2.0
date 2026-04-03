"use client";

import React, { useState, useEffect } from "react";
import { Check, Info, ShieldCheck, Zap, Crown, ArrowLeft, Loader2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import TwitterLogo from "@/components/Twitterlogo";
import Link from "next/link";
import axiosInstance from "@/lib/axiosInstance";
import { useTranslation } from "react-i18next";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PLANS = (t: any) => [
    {
        name: "Free",
        price: "₹0",
        id: "Free",
        features: [t("one_tweet_day"), t("standard_support"), t("basic_features")],
        color: "bg-gray-500",
        icon: <Zap className="h-6 w-6" />,
    },
    {
        name: "Bronze",
        price: "₹100",
        id: "Bronze",
        features: [t("three_tweets_day"), t("priority_support"), t("basic_analytics")],
        color: "bg-orange-600",
        icon: <Zap className="h-6 w-6" />,
    },
    {
        name: "Silver",
        price: "₹300",
        id: "Silver",
        features: [t("five_tweets_day"), t("premium_support"), t("advanced_analytics")],
        color: "bg-gray-300 text-black",
        icon: <ShieldCheck className="h-6 w-6" />,
    },
    {
        name: "Gold",
        price: "₹1000",
        id: "Gold",
        features: [t("unlimited_tweets"), t("dedicated_support"), t("full_feature_set")],
        color: "bg-yellow-500 text-black",
        icon: <Crown className="h-6 w-6" />,
    },
];

export default function SubscriptionPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isMounting, setIsMounting] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsMounting(false);
    }, []);

    const handleSubscribe = async (plan: string) => {
        if (!user) {
            alert(t("login_to_subscribe"));
            return;
        }

        if (plan === "Free") {
            alert(t("already_on_free"));
            return;
        }

        setIsLoading(plan);
        setError(null);

        try {
            // 1. Create Order on Backend
            const { data: order } = await axiosInstance.post("/create-order", {
                plan,
                email: user.email,
            });

            // 2. Open Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
                amount: order.amount,
                currency: order.currency,
                name: "Twiller Premium",
                description: `Upgrade to ${plan} Plan`,
                image: "/logo.png",
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify Payment on Backend
                        await axiosInstance.post("/verify-payment", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            email: user.email,
                            plan,
                        });

                        alert(t("payment_success", { plan }));
                        window.location.href = "/";
                    } catch (err: any) {
                        setError(err.response?.data?.error || t("something_wrong"));
                    }
                },
                prefill: {
                    name: user.displayName,
                    email: user.email,
                },
                theme: {
                    color: "#1DA1F2",
                },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                setError(response.error.description);
            });
            rzp1.open();
        } catch (err: any) {
            setError(err.response?.data?.error || t("something_wrong"));
        } finally {
            setIsLoading(null);
        }
    };

    if (isMounting) return null;

    const currentPlan = (user as any)?.subscriptionPlan || "Free";
    const plans = PLANS(t);

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-6xl">
                <div className="flex items-center justify-between mb-12">
                    <Link href="/" className="flex items-center text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6 mr-2" />
                        <span>{t("back_to_feed")}</span>
                    </Link>
                    <TwitterLogo size="lg" className="text-white" />
                    <div className="w-24"></div> {/* Spacer */}
                </div>

                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("choose_plan")}</h1>
                    <p className="text-xl text-gray-400">{t("upgrade_experience")}</p>

                    <div className="mt-6 inline-flex items-center px-4 py-2 bg-blue-900/20 border border-blue-800 rounded-full text-blue-400">
                        <Clock className="h-5 w-5 mr-2" />
                        <span>{t("payment_time_notice")}</span>
                    </div>
                </div>

                {error && (
                    <div className="max-w-md mx-auto mb-8 bg-red-900/20 border border-red-800 rounded-lg p-4 flex items-start space-x-3 text-red-400">
                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {plans.map((plan: any) => (
                        <Card
                            key={plan.id}
                            className={`bg-gray-900/40 backdrop-blur-xl border-gray-800 flex flex-col relative overflow-hidden transition-all duration-500 hover:scale-105 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(29,161,242,0.15)] ${currentPlan === plan.id ? "ring-2 ring-blue-500 border-blue-500" : ""
                                }`}
                        >
                            {currentPlan === plan.id && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                    {t("current_plan")}
                                </div>
                            )}

                            <CardHeader className="pb-2">
                                <div className={`p-4 rounded-2xl w-fit mb-6 shadow-lg ${plan.color}`}>
                                    {plan.icon}
                                </div>
                                <CardTitle className="text-2xl font-bold text-white tracking-tight">{plan.name}</CardTitle>
                                <div className="mt-4 flex items-baseline">
                                    <span className="text-5xl font-black text-white">{plan.price}</span>
                                    <span className="ml-2 text-gray-500 font-medium">/{t("month")}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-grow">
                                <ul className="space-y-4">
                                    {plan.features.map((feature: string, idx: number) => (
                                        <li key={idx} className="flex items-start">
                                            <Check className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>

                            <CardFooter className="pt-6">
                                <Button
                                    className={`w-full py-7 rounded-2xl font-bold text-lg transition-all transform active:scale-95 ${currentPlan === plan.id
                                        ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                                        : plan.name === "Gold"
                                            ? "bg-blue-500 hover:bg-blue-600 text-white shadow-[0_0_20px_rgba(29,161,242,0.4)]"
                                            : "bg-white hover:bg-gray-200 text-black shadow-lg"
                                        }`}
                                    disabled={!!isLoading || currentPlan === plan.id || plan.id === "Free"}
                                    onClick={() => handleSubscribe(plan.id)}
                                >
                                    {isLoading === plan.id ? (
                                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    ) : currentPlan === plan.id ? (
                                        t("active_plan")
                                    ) : plan.id === "Free" ? (
                                        t("everything_included")
                                    ) : (
                                        t("upgrade_now")
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <div className="mt-16 bg-gray-900/30 border border-gray-800 rounded-2xl p-8 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8">
                    <div className="bg-blue-500 p-4 rounded-full">
                        <Info className="h-10 w-10 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-2 text-white">{t("why_subscribe")}</h3>
                        <p className="text-gray-400 leading-relaxed">
                            {t("subscribe_reason")}
                        </p>
                    </div>
                </div>

                <p className="mt-12 text-center text-gray-500 text-sm">
                    {t("secure_payment_notice")}
                </p>
            </div>
        </div>
    );
}

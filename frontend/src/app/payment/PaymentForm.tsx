"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Check, X } from "lucide-react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const PLANS = {
    IN: [
        {
            name: "Starter",
            price: 9999,
            currency: "₹",
            features: [
                "1 Campaign",
                "1 WhatsApp number",
                "Keyword engine (one-time extraction)",
                "3 reels per week",
                "Basic VSL funnel",
                "1 Sales Agent"
            ],
            amount_paisa: 999900
        },
        {
            name: "Growth",
            price: 18999,
            currency: "₹",
            popular: true,
            features: [
                "3 Campaigns",
                "3 WhatsApp numbers",
                "Daily reel automation",
                "Advanced VSL funnel",
                "3 Sales Agents",
                "Priority job queue"
            ],
            amount_paisa: 1899900
        },
        {
            name: "Pro",
            price: 39999,
            currency: "₹",
            features: [
                "10 Campaigns",
                "10 WhatsApp numbers",
                "Daily automation (higher limits)",
                "Advanced keyword scoring",
                "Unlimited agents",
                "Highest queue priority",
                "Affiliate access"
            ],
            amount_paisa: 3999900
        }
    ],
    US: [
        {
            name: "Starter",
            price: 199,
            currency: "$",
            features: [
                "1 Campaign",
                "1 WhatsApp number",
                "3 reels per week",
                "Basic VSL funnel",
                "1 Agent"
            ],
            stripe_price_id: "price_starter_us"
        },
        {
            name: "Growth",
            price: 399,
            currency: "$",
            popular: true,
            features: [
                "3 Campaigns",
                "3 WhatsApp numbers",
                "Daily automation",
                "Advanced funnel",
                "3 Agents",
                "Priority processing"
            ],
            stripe_price_id: "price_growth_us"
        },
        {
            name: "Pro",
            price: 799,
            currency: "$",
            features: [
                "10 Campaigns",
                "10 WhatsApp numbers",
                "Higher automation limits",
                "Unlimited agents",
                "Highest queue priority",
                "Affiliate program access"
            ],
            stripe_price_id: "price_pro_us"
        }
    ]
};

const COURSE_PRICING = {
    US: [
        { name: "Starter", price: 149, stripe_orig_price: 199 },
        { name: "Growth", price: 299, stripe_orig_price: 399 },
        { name: "Pro", price: 599, stripe_orig_price: 799 }
    ]
};

const ALL_FEATURES = [
    { name: "Social Accounts", access: ["1", "3", "10"] },
    { name: "WhatsApp Numbers", access: ["1", "3", "10"] },
    { name: "Reel Automation", access: ["3/week", "Daily", "Daily (High Limits)"] },
    { name: "VSL Funnel", access: ["Basic", "Advanced", "Advanced"] },
    { name: "Sales Agents", access: ["1", "3", "Unlimited"] },
    { name: "Keyword Engine", access: ["One-time", "Standard", "Advanced Scoring"] },
    { name: "Queue Priority", access: ["Standard", "High", "Highest"] },
    { name: "Affiliate Access", access: [false, false, true] },
];

export default function PaymentForm({ initialCountry }: { initialCountry: string }) {
    const [loading, setLoading] = useState(false);
    const [isCourseAttendee, setIsCourseAttendee] = useState(false);
    const router = useRouter();

    // Determine Country Mode
    const country = initialCountry === 'IN' ? 'IN' : 'US';

    let currentPlans = PLANS[country];

    // Apply Course Discount for International
    if (country === 'US' && isCourseAttendee) {
        currentPlans = currentPlans.map(plan => {
            const discount = COURSE_PRICING.US.find(p => p.name === plan.name);
            if (discount) {
                return { ...plan, price: discount.price, original_price: discount.stripe_orig_price };
            }
            return plan;
        });
    }

    const handlePayment = async (plan: any) => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                alert("User not logged in");
                return;
            }

            const token = await user.getIdToken();

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payment/create-checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    country: country,
                    plan: plan.name,
                    amount: plan.amount_paisa || (plan.price * 100),
                    is_course_offer: isCourseAttendee
                })
            });

            const data = await response.json();

            if (data.url) {
                // Stripe Redirect
                window.location.href = data.url;
            } else if (data.orderId) {
                // Razorpay Logic
                const options = {
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: "AI Video Funnel",
                    description: `${plan.name} Plan (Yearly)`,
                    order_id: data.orderId,
                    handler: async function (response: any) {
                        alert("Payment Successful! Order ID: " + response.razorpay_order_id);
                        router.push("/dashboard");
                    },
                    prefill: {
                        name: user.displayName,
                        email: user.email,
                    },
                    theme: {
                        color: "#9333ea",
                    },
                };

                const rzp1 = new window.Razorpay(options);
                rzp1.open();
            }

        } catch (e) {
            console.error(e);
            alert("Payment init failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Choose Your Plan
                </h1>
                <p className="text-gray-400 text-lg md:text-xl mb-4">
                    Unlock the full power of AI automation for your video funnel.
                </p>

                <div className="flex flex-col items-center justify-center gap-4">
                    {country === 'US' && (
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-400">Standard Pricing</span>
                            <button
                                onClick={() => setIsCourseAttendee(!isCourseAttendee)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isCourseAttendee ? 'bg-purple-600' : 'bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isCourseAttendee ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-sm text-white font-medium">Course Attendee Offer</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 animate-fade-in-up">
                {currentPlans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`relative bg-zinc-900/50 rounded-3xl border p-8 flex flex-col hover:border-purple-500/50 transition-all duration-300 ${plan.popular ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-105 z-10' : 'border-white/10'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                MOST POPULAR
                            </div>
                        )}

                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="flex items-baseline mb-6">
                            <span className="text-4xl font-bold text-white">{plan.currency}{plan.price.toLocaleString()}</span>
                            <span className="text-gray-500 ml-2">/ year</span>
                        </div>

                        {plan.original_price && (
                            <div className="mb-4 text-sm text-gray-400 line-through">
                                Regular Price: {plan.currency}{plan.original_price}
                            </div>
                        )}

                        <ul className="space-y-4 mb-8 flex-grow">
                            {plan.features.map((feature: string, i: number) => (
                                <li key={i} className="flex items-start text-gray-300 text-sm">
                                    <Check className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handlePayment(plan)}
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold transition-all ${plan.popular
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/25'
                                : 'bg-white/10 hover:bg-white/20 text-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? "Processing..." : `Get ${plan.name}`}
                        </button>
                    </div>
                ))}
            </div>

            {/* Feature Comparison Table */}
            <div className="bg-zinc-900/30 rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/5">
                    <h3 className="text-2xl font-bold text-center">Compare Features</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-black/20">
                                <th className="p-6 text-left text-gray-400 font-medium">Features</th>
                                {currentPlans.map(p => (
                                    <th key={p.name} className="p-6 text-center text-white font-bold">{p.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ALL_FEATURES.map((feature, idx) => (
                                <tr key={feature.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-6 text-gray-300 font-medium">{feature.name}</td>
                                    {feature.access.map((val, i) => (
                                        <td key={i} className="p-6 text-center text-gray-400">
                                            {typeof val === 'boolean' ? (
                                                val ? <Check className="w-6 h-6 text-green-400 mx-auto" /> : <X className="w-6 h-6 text-gray-600 mx-auto" />
                                            ) : (
                                                <span className="text-white">{val}</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <p className="text-center text-gray-600 mt-12 text-sm">
                Secure payment powered by {country === 'IN' ? 'Razorpay' : 'Stripe'}. <br />
                All plans include 24/7 support and 7-day money-back guarantee.
            </p>
        </div>
    );
}

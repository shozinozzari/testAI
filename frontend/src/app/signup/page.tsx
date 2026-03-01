"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleGoogleSignIn = async () => {
        console.log("Attempting Google Sign-In...");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            console.log("Google Sign-In Success:", result.user);
            router.push("/profiling");
        } catch (err: any) {
            console.error("Google Sign-In Error:", err);
            console.error("Error Code:", err.code);
            console.error("Error Message:", err.message);
            setError(`Login Failed: ${err.message}`);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Attempting Email Signup...");
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log("Email Signup Success");
            router.push("/profiling");
        } catch (err: any) {
            console.error("Email Signup Error:", err);
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight">Create your account</h2>
                </div>

                <div className="mt-8 space-y-6">
                    {/* Google Button */}
                    <button
                        onClick={handleGoogleSignIn}
                        className="flex w-full justify-center items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Sign up with Google
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-black px-2 text-gray-400">Or continue with</span>
                        </div>
                    </div>

                    <form className="space-y-6" onSubmit={handleSignup}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <input
                                    type="email"
                                    required
                                    className="relative block w-full rounded-t-md border-0 py-1.5 bg-zinc-900 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 px-3"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    required
                                    className="relative block w-full rounded-b-md border-0 py-1.5 bg-zinc-900 text-white ring-1 ring-inset ring-white/10 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-purple-500 sm:text-sm sm:leading-6 px-3"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                className="group relative flex w-full justify-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                            >
                                Sign up with Email
                            </button>
                        </div>
                    </form>
                </div>

                <div className="text-sm text-center">
                    <Link href="/login" className="font-medium text-purple-400 hover:text-purple-300">
                        Already have an account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}

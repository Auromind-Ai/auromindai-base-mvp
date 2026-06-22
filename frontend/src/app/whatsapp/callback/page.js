"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import api from "@/lib/api";

function WhatsAppIcon() {
    return (
        <svg viewBox="0 0 48 48" className="w-16 h-16 animate-pulse" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="24" fill="#14c956" />
            <path d="M34.5 13.4C32.1 11 28.9 9.6 25.5 9.6c-7 0-12.7 5.7-12.7 12.7 0 2.2.6 4.4 1.7 6.3L12.6 35l6.6-1.7c1.8 1 3.8 1.5 5.9 1.5 7 0 12.7-5.7 12.7-12.7-.1-3.4-1.5-6.5-3.3-8.7zm-9 19.5c-1.9 0-3.7-.5-5.3-1.4l-.4-.2-3.9 1 1-3.8-.2-.4c-1-1.6-1.6-3.5-1.6-5.4 0-5.6 4.6-10.2 10.2-10.2 2.7 0 5.3 1.1 7.2 2.9 1.9 1.9 3 4.4 3 7.1.2 5.8-4.4 10.4-10 10.4zm5.6-7.6c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1c-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9s0-.5.2-.6l.5-.6c.1-.2.2-.4.3-.6 0-.2 0-.4-.1-.6s-.7-1.7-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4s-1 1-1 2.5 1 2.9 1.2 3.1c.2.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.5-.4z" fill="white" />
        </svg>
    );
}

function WhatsAppCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("Initializing WhatsApp Connection...");
    const [subStatus, setSubStatus] = useState("Securing credentials and validating handshake...");
    const [isError, setIsError] = useState(false);
    const hasRun = useRef(false);

    useEffect(() => {
        if (!searchParams || hasRun.current) return;
        hasRun.current = true;

        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            console.error("WhatsApp OAuth error:", error);
            setStatus("Authentication Failed");
            setSubStatus(`OAuth error from Meta: ${error}`);
            setIsError(true);
            return;
        }

        if (!code) {
            setStatus("Authorization Code Missing");
            setSubStatus("Meta did not provide a valid authorization code.");
            setIsError(true);
            return;
        }

        let workspace_id = null;
        if (typeof window !== "undefined") {
            workspace_id = localStorage.getItem("whatsapp_workspace_id");
        }

        if (!workspace_id) {
            setStatus("Workspace Context Missing");
            setSubStatus("Unable to locate active workspace. Please try reconnecting from the dashboard.");
            setIsError(true);
            return;
        }

        const connectWhatsApp = async () => {
            try {
                setStatus("Connecting to Auromind backend...");
                setSubStatus("Exchanging authorization code with Meta APIs...");

                const redirectUri = `${window.location.origin}/whatsapp/callback`;

                const data = await api.connectWhatsApp({
                    code,
                    workspace_id,
                    redirect_uri: redirectUri
                });

                setStatus("WhatsApp Connected!");
                setSubStatus(`Successfully connected account: ${data.display_number || "Active"}`);
                localStorage.setItem("whatsapp_connected", "true");
                if (data.display_number) {
                    localStorage.setItem("whatsapp_phone", data.display_number);
                }
                localStorage.removeItem("whatsapp_workspace_id");

                setTimeout(() => {
                    router.push("/user/admin/channels");
                }, 2000);
            } catch (err) {
                console.error("❌ WhatsApp connect failed:", err);
                setStatus("Connection Failed");
                setSubStatus(err?.detail || err?.message || JSON.stringify(err));
                setIsError(true);
            }
        };

        connectWhatsApp();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#070509] relative flex items-center justify-center overflow-hidden font-sans">
            {/* Glowing Background Blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#14c956]/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7928ca]/15 rounded-full blur-[120px] animate-pulse"></div>

            <div className="relative z-10 w-full max-w-md mx-4 p-8 rounded-3xl border border-white/10 bg-[#0d0d0d]/80 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(20,201,86,0.2)] text-center transition-all duration-300">
                <div className="flex justify-center mb-6">
                    <div className={`p-4 rounded-2xl ${isError ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                        {isError ? (
                            <svg className="w-12 h-12 text-red-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        ) : (
                            <WhatsAppIcon />
                        )}
                    </div>
                </div>

                <h1 className={`text-2xl font-bold tracking-tight mb-2 ${isError ? 'text-red-400' : 'text-white'}`}>
                    {status}
                </h1>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    {subStatus}
                </p>

                {!isError && (
                    <div className="flex justify-center items-center gap-1.5 py-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#14c956] animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#14c956] animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#14c956] animate-bounce"></span>
                    </div>
                )}

                {isError && (
                    <button
                        onClick={() => router.push("/user/admin/channels")}
                        className="mt-2 w-full py-3 px-5 rounded-xl text-white font-medium bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-[0.98]"
                    >
                        Go Back to Channels
                    </button>
                )}
            </div>
        </div>
    );
}

export default function WhatsAppCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#070509] flex items-center justify-center text-white">
                <p className="text-lg text-gray-400">Loading WhatsApp Connection...</p>
            </div>
        }>
            <WhatsAppCallbackContent />
        </Suspense>
    );
}

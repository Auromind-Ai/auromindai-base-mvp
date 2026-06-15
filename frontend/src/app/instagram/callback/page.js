"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { getToken,authHeader } from "@/lib/auth";
import { AlertCircle, ArrowLeft } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function InstagramCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("Connecting Instagram...");
    const [isError, setIsError] = useState(false);
    const hasRun = useRef(false); // prevent double execution

    useEffect(() => {
        if (!searchParams || hasRun.current) return;
        hasRun.current = true;

        const code = searchParams.get("code");
        const error = searchParams.get("error");

        // OAuth error handling
        if (error) {
            setIsError(true);
            if (error === 'access_denied') {
                setStatus("Connection Canceled: You denied access to connect Instagram. Please try again and grant all permissions.");
            } else {
                setStatus(`OAuth failed: ${error}`);
            }
            return;
        }

        if (!code) {
            setIsError(true);
            setStatus("No code received from Instagram.");
            return;
        }

        //  Safe localStorage access
        let workspace_id = null;
        if (typeof window !== "undefined") {
            workspace_id = localStorage.getItem("instagram_workspace_id"); 
        }

        if (!workspace_id) {
            setIsError(true);
            setStatus("Workspace ID missing. Please reconnect.");
            return;
        }

        console.log("CODE:", code);
        console.log("WORKSPACE:", workspace_id);

        const connectInstagram = async () => {
            try {
                const token = getToken();
                const res = await fetch(`${API}/api/instagram/connect`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "ngrok-skip-browser-warning": "true",
                        ...(token ? { "Authorization": `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({
                        code,
                        workspace_id,
                    }),
                });

                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    console.error("Failed to parse JSON. Raw response:", text);
                    if (!res.ok) throw new Error(`API Error ${res.status}: ${text}`);
                    return;
                }
                console.log("FULL RESPONSE:", data);

                if (!res.ok) {
                    throw data;
                }

                setStatus("Connected! Redirecting...");

                //  cleanup
                localStorage.removeItem("instagram_workspace_id");

                setTimeout(() => {
                    router.push("/user/admin/channels");
                }, 1500);
            } catch (err) {
                console.error("❌ Instagram connect failed:", err);
                setIsError(true);
                const errorMsg = err?.detail || err?.message || (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
                setStatus(`Connection failed: ${errorMsg}`);
            }
        };

        connectInstagram();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#050508] flex items-center justify-center p-6 text-white font-sans">
            <div className="max-w-md w-full bg-[#111116] border border-white/10 rounded-2xl p-8 text-center flex flex-col items-center">
                {isError ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-6">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
                        <p className="text-[#a1a1aa] mb-8 leading-relaxed">{status}</p>
                        <button 
                            onClick={() => router.push('/user/admin/channels')}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                        >
                            <ArrowLeft size={18} />
                            Return to Channels
                        </button>
                    </>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-6" />
                        <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
                        <p className="text-[#a1a1aa]">{status}</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function InstagramCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-white">
                <p className="text-lg">Loading Instagram Connection...</p>
            </div>
        }>
            <InstagramCallbackContent />
        </Suspense>
    );
}
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import { getToken,authHeader } from "@/lib/auth";

function InstagramCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("Connecting Instagram...");
    const hasRun = useRef(false); // prevent double execution

    useEffect(() => {
        if (!searchParams || hasRun.current) return;
        hasRun.current = true;

        const code = searchParams.get("code");
        const error = searchParams.get("error");

        // OAuth error handling
        if (error) {
            console.error("Instagram OAuth error:", error);
            setStatus(`OAuth failed: ${error}`);
            return;
        }

        if (!code) {
            setStatus("No code received from Instagram.");
            return;
        }

        //  Safe localStorage access
        let workspace_id = null;
        if (typeof window !== "undefined") {
            workspace_id = localStorage.getItem("instagram_workspace_id"); 
        }

        if (!workspace_id) {
            setStatus("Workspace ID missing. Please reconnect.");
            return;
        }

        console.log("CODE:", code);
        console.log("WORKSPACE:", workspace_id);

        const connectInstagram = async () => {
            try {
                const token = getToken();
                const res = await fetch(`/backend/api/instagram/connect`, {
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
                setStatus(
                    `Connection failed: ${err?.detail || JSON.stringify(err)
                    }`
                );
            }
        };

        connectInstagram();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-white">
            <p className="text-lg">{status}</p>
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
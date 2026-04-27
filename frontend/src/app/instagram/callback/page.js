"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function InstagramCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState("Connecting Instagram...");
    const hasRun = useRef(false); // ✅ prevent double execution

    useEffect(() => {
        if (!searchParams || hasRun.current) return;
        hasRun.current = true;

        const code = searchParams.get("code");
        const error = searchParams.get("error");

        // ✅ OAuth error handling
        if (error) {
            console.error("Instagram OAuth error:", error);
            setStatus(`OAuth failed: ${error}`);
            return;
        }

        if (!code) {
            setStatus("No code received from Instagram.");
            return;
        }

        // ✅ Safe localStorage access
        let workspace_id = null;
        if (typeof window !== "undefined") {
            workspace_id = localStorage.getItem("instagram_workspace_id"); // ✅ FIXED KEY
        }

        if (!workspace_id) {
            setStatus("Workspace ID missing. Please reconnect.");
            return;
        }

        console.log("CODE:", code);
        console.log("WORKSPACE:", workspace_id);

        const API_BASE =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        const connectInstagram = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/instagram/connect`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        code,
                        workspace_id,
                    }),
                });

                const data = await res.json();
                console.log("FULL RESPONSE:", data);

                if (!res.ok) {
                    throw data;
                }

                setStatus("✅ Connected! Redirecting...");

                // ✅ cleanup
                localStorage.removeItem("instagram_workspace_id");

                setTimeout(() => {
                    router.push("/channels");
                }, 1500);
            } catch (err) {
                console.error("❌ Instagram connect failed:", err);
                setStatus(
                    `Connection failed: ${
                        err?.detail || JSON.stringify(err)
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
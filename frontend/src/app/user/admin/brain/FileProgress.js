"use client";

const API = '/api';

import { useEffect, useState } from "react";
import { authHeader } from "@/lib/auth";

export default function FileProgress({ entryId, onDone }) {
  const [status, setStatus] = useState("pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entryId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}/brain/ingest/status/${entryId}`,
          { headers: { ...authHeader() } }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch status");
        }

        const data = await res.json();
        setStatus(data.status);

        if (data.status === "failed") {
          setErrorMessage(data.error_message || "Something went wrong");
          setLoading(false);
          clearInterval(interval);
        }

        if (data.status === "completed") {
          setLoading(false);
          clearInterval(interval);
          setTimeout(() => {
          onDone?.();   // notify parent
         }, 2000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [entryId]);

  return (
    <div className="flex items-center gap-3 p-4 border rounded-md w-fit">
      {/* PENDING / PROCESSING */}
      {(status === "pending" || status === "processing") && (
        <>
          <div className="h-5 w-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />
          <span className="text-yellow-600 font-medium">
            Processing file...
          </span>
        </>
      )}

      {/* COMPLETED */}
      {status === "completed" && (
        <>
          <span className="text-green-600 text-xl">✔</span>
          <span className="text-green-600 font-medium">
            File processed successfully
          </span>
        </>
      )}

      {/* FAILED */}
      {status === "failed" && (
        <>
          <span className="text-red-600 text-xl">✖</span>
          <span className="text-red-600 font-medium">
            {errorMessage}
          </span>
        </>
      )}
    </div>
  );
}

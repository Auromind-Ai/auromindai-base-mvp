"use client";

import { useState, useEffect } from 'react';
import api from "@/lib/api";

export default function FileProgress({ 
  entryId, 
  onDone, 
  processingText = "Processing file...", 
  successText = "File processed successfully", 
  failedText = "Processing failed" 
}) {
  const [status, setStatus] = useState("pending");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entryId) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.getIngestStatus(entryId);
        if (!data) return;
        setStatus(data.status);

        if (data.status === "failed") {
          setErrorMessage(data.error_message || failedText);
          setLoading(false);
          clearInterval(interval);
        }

        if (data.status === "completed") {
          setLoading(false);
          clearInterval(interval);
          setTimeout(() => {
            onDone?.(); // notify parent
          }, 2000);
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [entryId, failedText, onDone]);

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-[#0d0d14] border border-white/10 rounded-xl w-fit shadow-lg transition-all animate-in fade-in duration-200">
      {/* PENDING / PROCESSING */}
      {(status === "pending" || status === "processing") && (
        <>
          <div className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
          <span className="text-amber-400 font-medium text-xs">
            {processingText}
          </span>
        </>
      )}

      {/* COMPLETED */}
      {status === "completed" && (
        <>
          <span className="text-emerald-400 text-xs font-bold">✔</span>
          <span className="text-emerald-400 font-medium text-xs">
            {successText}
          </span>
        </>
      )}

      {/* FAILED */}
      {status === "failed" && (
        <>
          <span className="text-rose-400 text-xs font-bold">✖</span>
          <span className="text-rose-400 font-medium text-xs">
            {errorMessage}
          </span>
        </>
      )}
    </div>
  );
}

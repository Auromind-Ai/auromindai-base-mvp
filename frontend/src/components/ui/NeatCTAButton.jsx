'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function NeatCTAButton({ href, className, children, onClick, ...props }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    
    if (href && !href.startsWith("#")) {
      e.preventDefault();
      setLoading(true);
      router.push(href);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "group relative transition-all duration-300 disabled:cursor-not-allowed select-none",
        loading && "pointer-events-none opacity-90",
        className
      )}
      {...props}
    >
      {/* Loading spinner overlay */}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center rounded-inherit z-10 text-current">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
      
      {/* Inner content (fades out when loading) */}
      <span className={cn("flex items-center justify-center gap-2 w-full h-full transition-opacity duration-200", loading && "opacity-0")}>
        {children}
      </span>
    </button>
  );
}

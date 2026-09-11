"use client";

import DocumentationScreenshot from "@/components/docs/DocumentationScreenshot";

export default function InboxDetailVisual() {
  return (
    <DocumentationScreenshot
      src="/images/doc-images/multichannel-conversation-overview.png"
      alt="WhatsApp Inbox showing channel tabs, an open conversation, reply composer, contact details, and conversation actions"
      caption="Illustrative screenshot with example conversation data. Click to expand."
      aspectRatio="aspect-[1683/935] [&_img]:object-contain"
      className="[&>div:first-child]:border-0 [&>div:first-child]:rounded-none [&>div:first-child]:bg-transparent [&>div:first-child]:shadow-none"
    />
  );
}

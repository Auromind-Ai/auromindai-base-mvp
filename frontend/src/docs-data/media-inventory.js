/**
 * OrbionAgents Documentation Media & Asset Inventory
 * 
 * Structured content model for managing contextual product media assets.
 * When actual recordings/screenshots become available, assets can be
 * linked directly by updating videoUrl/screenshotUrls without page redesigns.
 */

export const MEDIA_INVENTORY = {
  "features/omni-inbox": {
    featureName: "Omni-Channel Inbox & Human Takeover",
    featureSlug: "features/omni-inbox",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/omni-inbox.mp4",
    videoDuration: "1:30",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/omni-inbox-live.png",
      "/docs/screenshots/human-takeover-modal.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Pending final UI screen capture of human takeover state across WhatsApp and Instagram."
  },
  "features/brain-rag": {
    featureName: "AI Brain (RAG & Knowledge Base)",
    featureSlug: "features/brain-rag",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/ai-brain-rag.mp4",
    videoDuration: "1:15",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/brain-rag-documents.png",
      "/docs/screenshots/brain-vector-chunks.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "High-DPI slot ready for PDF upload and pgvector chunk inspection screenshot."
  },
  "features/ai-workspace": {
    featureName: "AI Workspace & Smart Copilot",
    featureSlug: "features/ai-workspace",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/ai-workspace.mp4",
    videoDuration: "0:38",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/ai-workspace-tool-calling.png",
      "/docs/screenshots/ai-workspace-streaming.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Covers real-time streaming tokens, multi-model selection (Auto, Groq, Sonnet, Opus, Gemini), Brain RAG source scoping, and document analysis."
  },
  "features/leads-crm": {
    featureName: "Leads & CRM Pipeline",
    featureSlug: "features/leads-crm",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/leads-pipeline.mp4",
    videoDuration: "1:05",
    screenshotAvailable: true,
    screenshotVersion: "v2.3.1",
    screenshotUrls: [
      "/images/lead-qualification.webp"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Active screenshot embedded from CRM pipeline view."
  },
  "features/agentic-orchestrator": {
    featureName: "Agentic Orchestrator (Wires)",
    featureSlug: "features/agentic-orchestrator",
    videoAvailable: true,
    videoVersion: "v2.4.0",
    videoUrl: "/docs/videos/Screen Recording 2026-09-11 104247.mp4",
    videoDuration: "Walkthrough Demo",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/orchestrator-canvas.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Active production video walkthrough demonstrating the visual workflow canvas in action."
  },
  "features/campaigns": {
    featureName: "WhatsApp Campaigns & Broadcasts",
    featureSlug: "features/campaigns",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/campaigns-overview.mp4",
    videoDuration: "1:15",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/campaigns-funnel.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Audience segmentation and 7-stage delivery funnel."
  },
  "account/ai-governance": {
    featureName: "AI Governance & Safeguards (MCP)",
    featureSlug: "account/ai-governance",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/ai-governance.mp4",
    videoDuration: "1:20",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/mcp-policy-editor.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Model Context Protocol guardrails and PII masking."
  },
  "features/credits-wallet": {
    featureName: "Credits, Wallet & Token Metering",
    featureSlug: "features/credits-wallet",
    videoAvailable: false,
    videoVersion: null,
    videoUrl: "/docs/videos/credits-wallet.mp4",
    videoDuration: "0:45",
    screenshotAvailable: false,
    screenshotVersion: null,
    screenshotUrls: [
      "/docs/screenshots/wallet-token-ring.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Real-time token burn and auto-recharge settings."
  },
  "integrations/whatsapp-cloud-api": {
    featureName: "WhatsApp Business Cloud API",
    featureSlug: "integrations/whatsapp-cloud-api",
    videoAvailable: true,
    videoVersion: "v2.4.0",
    videoUrl: "/videos/IMG_3477.mp4",
    videoDuration: "1:03",
    screenshotAvailable: true,
    screenshotVersion: "v2.4.0",
    screenshotUrls: [
      "/images/docs/whatsapp-connect/step-1-channels-dashboard.png",
      "/images/docs/whatsapp-connect/step-2-meta-login-continue.png",
      "/images/docs/whatsapp-connect/step-3-select-portfolio.png",
      "/images/docs/whatsapp-connect/step-4-business-information.png",
      "/images/docs/whatsapp-connect/step-5-phone-number-entry.png",
      "/images/docs/whatsapp-connect/step-6-otp-verification.png",
      "/images/docs/whatsapp-connect/step-7-connection-complete.png",
      "/images/docs/whatsapp-connect/step-8-connected-status.png"
    ],
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0",
    notes: "Official 1-click Meta Facebook Login for Business onboarding with 8-step visual walkthrough."
  }
};

export function getMediaStatus(slug) {
  return MEDIA_INVENTORY[slug] || {
    featureSlug: slug,
    videoAvailable: false,
    screenshotAvailable: false,
    documentationStatus: "Complete",
    currentProductVersion: "v2.4.0"
  };
}

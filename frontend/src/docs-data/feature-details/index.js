import { omniInboxDetail } from './omni-inbox.js';
import { brainRagDetail } from './brain-rag.js';
import { aiWorkspaceDetail } from './ai-workspace.js';
import { leadsCrmDetail } from './leads-crm.js';
import { agenticOrchestratorDetail } from './agentic-orchestrator.js';
import { aiGovernanceDetail } from './ai-governance.js';
import { creditsWalletDetail } from './credits-wallet.js';
import { integrationsDetail } from './integrations.js';

export const ALL_FEATURE_DETAILS = [
  omniInboxDetail,
  brainRagDetail,
  aiWorkspaceDetail,
  leadsCrmDetail,
  agenticOrchestratorDetail,
  aiGovernanceDetail,
  creditsWalletDetail,
  integrationsDetail,
];

export function getFeatureDetailConfig(slug) {
  if (!slug) return null;
  const normalized = String(slug).trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  
  // Direct match on slug
  const directMatch = ALL_FEATURE_DETAILS.find((f) => f.slug === normalized);
  if (directMatch) return directMatch;

  // Match on aliasSlugs
  const aliasMatch = ALL_FEATURE_DETAILS.find((f) => 
    f.aliasSlugs && f.aliasSlugs.some((alias) => alias.toLowerCase() === normalized)
  );
  if (aliasMatch) return aliasMatch;

  // Match on trailing part e.g. "features/omni-inbox" -> "omni-inbox"
  const parts = normalized.split('/');
  const lastPart = parts[parts.length - 1];
  const lastPartMatch = ALL_FEATURE_DETAILS.find((f) => f.slug === lastPart);
  if (lastPartMatch) return lastPartMatch;

  return null;
}

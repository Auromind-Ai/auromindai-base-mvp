import { GETTING_STARTED_ARTICLES } from './getting-started';
import { CORE_FEATURES_PART1 } from './core-features-part1';
import { CORE_FEATURES_PART2 } from './core-features-part2';
import { CORE_FEATURES_PART3 } from './core-features-part3';
import { INTEGRATIONS_ARTICLES } from './integrations';
import { ACCOUNT_AND_BILLING_ARTICLES } from './account-and-billing';
import { TROUBLESHOOTING_ARTICLES } from './troubleshooting';

export const DOCS_ARTICLES = {
  ...GETTING_STARTED_ARTICLES,
  ...CORE_FEATURES_PART1,
  ...CORE_FEATURES_PART2,
  ...CORE_FEATURES_PART3,
  ...INTEGRATIONS_ARTICLES,
  ...ACCOUNT_AND_BILLING_ARTICLES,
  ...TROUBLESHOOTING_ARTICLES,
};

export const SLUG_ALIASES = {
  'features/automation': 'features/agentic-orchestrator',
  'features/ai-brain': 'features/brain-rag',
  'features/lead-intelligence': 'features/leads-crm',
  'features/wallet': 'features/credits-wallet',
  'features/ai-governance': 'account/ai-governance',
};

export function getArticleBySlug(slug) {
  let normalizedSlug = Array.isArray(slug) ? slug.join('/') : slug;
  if (SLUG_ALIASES[normalizedSlug]) {
    normalizedSlug = SLUG_ALIASES[normalizedSlug];
  }
  return DOCS_ARTICLES[normalizedSlug] || null;
}

export function getAllArticles() {
  return Object.values(DOCS_ARTICLES);
}

export function getSearchIndex() {
  return Object.values(DOCS_ARTICLES).map((article) => ({
    slug: article.slug,
    category: article.category,
    title: article.title,
    subtitle: article.subtitle,
    whatIsIt: article.whatIsIt,
    whyUseIt: article.whyUseIt,
    hasVideo: !!article.video,
    keywords: article.seo?.keywords || [],
    steps: article.steps?.map((s) => s.title) || [],
    troubleshooting: article.troubleshooting?.map((t) => t.issue) || [],
  }));
}

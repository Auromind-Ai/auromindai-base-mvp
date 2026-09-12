import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { ALL_DOC_SLUGS } from '@/docs-data/docs-navigation';
import { getArticleBySlug, SLUG_ALIASES } from '@/docs-data/articles';
import { getFeatureDetailConfig } from '@/docs-data/feature-details';

import FeatureDetailView from '@/components/docs/features/FeatureDetailView';
import IntroductionDetailView from '@/components/docs/IntroductionDetailView';
import DynamicSectionRenderer from '@/components/docs/DynamicSectionRenderer';

export const dynamic = 'force-dynamic';

import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

export async function generateStaticParams() {
  return ALL_DOC_SLUGS.map((slug) => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug.join('/');
  const slug = SLUG_ALIASES[rawSlug] || rawSlug;

  const featureConfig = getFeatureDetailConfig(slug);

  if (featureConfig) {
    const title = `${featureConfig.title} — OrbionAgents Documentation`;
    const description =
      featureConfig.tagline || featureConfig.description;

    const url = `https://orbionagents.com/docs/${slug}`;

    return {
      title,
      description,
      keywords: [
        'OrbionAgents',
        featureConfig.title,
        featureConfig.category,
        'AI documentation',
      ],
      alternates: {
        canonical: url,
      },
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'OrbionAgents Documentation',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  }

  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Documentation Article Not Found | OrbionAgents',
      description:
        'The requested documentation page could not be located.',
    };
  }

  const title =
    article.seo?.title ||
    `${article.title} | OrbionAgents Documentation`;

  const description =
    article.seo?.description || article.subtitle;

  const url = `https://orbionagents.com/docs/${slug}`;

  return {
    title,
    description,
    keywords:
      article.seo?.keywords || [
        'OrbionAgents',
        'AI documentation',
        'WhatsApp automation',
      ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      siteName: 'OrbionAgents Documentation',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function DocsArticlePage({ params }) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams.slug.join('/');

  if (SLUG_ALIASES[rawSlug]) {
    redirect(`/docs/${SLUG_ALIASES[rawSlug]}`);
  }

  const slug = rawSlug;

  const featureConfig = getFeatureDetailConfig(slug);
  const article = getArticleBySlug(slug);

  if (!featureConfig && !article) {
    notFound();
  }

  // Navigation: Find previous and next articles
  const allSlugs = ALL_DOC_SLUGS;

  const currentIndex = allSlugs.indexOf(slug);

  const prevSlug =
    currentIndex > 0
      ? allSlugs[currentIndex - 1]
      : null;

  const nextSlug =
    currentIndex < allSlugs.length - 1
      ? allSlugs[currentIndex + 1]
      : null;

  const prevArticle = prevSlug
    ? getFeatureDetailConfig(prevSlug) ||
      getArticleBySlug(prevSlug)
    : null;

  const nextArticle = nextSlug
    ? getFeatureDetailConfig(nextSlug) ||
      getArticleBySlug(nextSlug)
    : null;

  // JSON-LD structured data for Google Search Breadcrumbs
  const pageTitle = featureConfig
    ? featureConfig.title
    : article.title;

  const pageCategory = featureConfig
    ? featureConfig.category
    : article.category;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Docs',
        item: 'https://orbionagents.com/docs',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageCategory,
        item: `https://orbionagents.com/docs#${pageCategory
          .toLowerCase()
          .replace(/[\s&]+/g, '-')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: pageTitle,
        item: `https://orbionagents.com/docs/${slug}`,
      },
    ],
  };

  // 1. If this is one of our 8 core bespoke feature pages,
  // render the purpose-built experience
  if (featureConfig) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />

        <div className="w-full">
          <FeatureDetailView
            config={featureConfig}
            prevArticle={prevArticle}
            nextArticle={nextArticle}
          />
        </div>
      </>
    );
  }

  // 2. Dedicated introduction page experience
  if (slug === 'getting-started/introduction') {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd),
          }}
        />

        <div className="w-full">
          <IntroductionDetailView
            article={article}
            prevArticle={prevArticle}
            nextArticle={nextArticle}
          />
        </div>
      </>
    );
  }

  // 3. Build sections dynamically from article definition
  let resolvedSections = [];

  if (
    article.sections &&
    Array.isArray(article.sections)
  ) {
    resolvedSections = article.sections;
  } else {
    // Backwards-compatible translation of article fields
    // without any generic marketing filler

    if (article.whatIsIt) {
      resolvedSections.push({
        id: 'overview',
        title: 'Overview',
        type: 'text',
        content: article.whatIsIt,
        screenshot: article.screenshots?.[0],
      });
    }

    if (
      article.beforeYouStart &&
      article.beforeYouStart.length > 0
    ) {
      resolvedSections.push({
        id: 'before-you-start',
        title: 'Before You Start',
        type: 'checklist',
        items: article.beforeYouStart,
      });
    }

    if (
      article.steps &&
      article.steps.length > 0
    ) {
      resolvedSections.push({
        id: 'step-by-step',
        title: 'Operational Guide',
        type: 'steps',
        steps: article.steps,
      });
    }

    if (article.expectedResult) {
      resolvedSections.push({
        id: 'expected-result',
        title: 'Expected Outcome',
        type: 'callout',
        content: article.expectedResult,
      });
    }

    if (
      article.troubleshooting &&
      article.troubleshooting.length > 0
    ) {
      resolvedSections.push({
        id: 'troubleshooting',
        title: 'Troubleshooting',
        type: 'troubleshooting',
        items: article.troubleshooting,
      });
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />

      <div className="w-full">
        <article
          className="space-y-10 pb-12 font-sans font-['Poppins',sans-serif]"
          style={{
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {/* Article Header & Breadcrumbs */}
          <header className="space-y-4 border-b border-white/[0.08] pb-6">
            <nav className="flex items-center gap-2 text-xs text-zinc-400 font-medium px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/5 w-fit">
              <Link
                href="/docs"
                className="hover:text-white transition-colors"
              >
                Docs
              </Link>

              <ChevronRight
                className="w-3.5 h-3.5 text-zinc-500"
                aria-hidden="true"
              />

              <span className="text-zinc-300">
                {article.category}
              </span>

              <ChevronRight
                className="w-3.5 h-3.5 text-zinc-500"
                aria-hidden="true"
              />

              <span className="text-violet-300 font-semibold truncate">
                {article.title}
              </span>
            </nav>

            <div className="flex items-center gap-2.5 pt-1">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 font-poppins">
                {article.category}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal max-w-3xl">
                {article.subtitle}
              </p>
            )}
          </header>

          {/* Render ONLY configured sections */}
          <DynamicSectionRenderer
            sections={resolvedSections}
          />

          {/* Previous / Next Navigation */}
          <footer className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {prevArticle ? (
              <Link
                href={`/docs/${prevArticle.slug}`}
                className="w-full sm:w-auto p-4.5 rounded-2xl border border-white/[0.08] bg-[#080910]/80 hover:bg-[#0C0D18]/90 hover:border-violet-500/40 flex items-center gap-3.5 transition-all group text-left shadow-lg"
              >
                <ArrowLeft
                  className="w-4 h-4 text-violet-400 group-hover:-translate-x-1 transition-transform"
                  aria-hidden="true"
                />

                <div>
                  <span className="text-[10px] uppercase text-zinc-400 block font-semibold">
                    Previous Guide
                  </span>

                  <span className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors truncate max-w-[220px] block">
                    {prevArticle.title}
                  </span>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextArticle && (
              <Link
                href={`/docs/${nextArticle.slug}`}
                className="w-full sm:w-auto p-4.5 rounded-2xl border border-white/[0.08] bg-[#080910]/80 hover:bg-[#0C0D18]/90 hover:border-violet-500/40 flex items-center justify-between sm:justify-end gap-3.5 transition-all group text-right ml-auto shadow-lg"
              >
                <div>
                  <span className="text-[10px] text-zinc-400 block font-semibold">
                    Next Guide
                  </span>

                  <span className="text-xs font-semibold text-white group-hover:text-violet-300 transition-colors truncate max-w-[220px] block">
                    {nextArticle.title}
                  </span>
                </div>

                <ArrowRight
                  className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </Link>
            )}
          </footer>
        </article>
      </div>
    </>
  );
}

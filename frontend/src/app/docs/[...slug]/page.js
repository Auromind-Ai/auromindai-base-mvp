import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ALL_DOC_SLUGS, DOCS_NAVIGATION } from '@/docs-data/docs-navigation';
import { getArticleBySlug, getAllArticles } from '@/docs-data/articles';
import DocumentationVideo from '@/components/docs/DocumentationVideo';
import DocumentationScreenshot from '@/components/docs/DocumentationScreenshot';
import DocumentationWorkflowVisualizer from '@/components/docs/DocumentationWorkflowVisualizer';
import DocsAlert from '@/components/docs/DocsAlert';
import DocsStepItem from '@/components/docs/DocsStepItem';
import DocsTableOfContents from '@/components/docs/DocsTableOfContents';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Share2,
  ChevronRight,
  BookOpen,
  Zap,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Building2,
  ShoppingCart,
  CalendarCheck,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export async function generateStaticParams() {
  return ALL_DOC_SLUGS.map((slug) => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug.join('/');
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: 'Documentation Article Not Found | OrbionAgents',
      description: 'The requested documentation page could not be located.',
    };
  }

  const title = article.seo?.title || `${article.title} | OrbionAgents Documentation`;
  const description = article.seo?.description || article.subtitle;
  const url = `https://orbionagents.com/docs/${slug}`;

  return {
    title,
    description,
    keywords: article.seo?.keywords || ['OrbionAgents', 'AI documentation', 'WhatsApp automation'],
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

const BENEFIT_CARDS = [
  {
    icon: Zap,
    title: 'Zero Latency Response',
    desc: 'Engage leads in < 2 seconds across WhatsApp and Instagram without human delays.',
  },
  {
    icon: Cpu,
    title: 'Contextual Intelligence',
    desc: 'LLMs grounded in your exact knowledge base, pricing sheets, and refund rules.',
  },
  {
    icon: ShieldCheck,
    title: 'Deterministic Governance',
    desc: 'Model Context Protocol (MCP) safeguards inspect every output before transmission.',
  },
  {
    icon: TrendingUp,
    title: 'Revenue Conversion',
    desc: 'Automatically qualify high-ticket inquiries and hand off to human closers seamlessly.',
  },
];

const INDUSTRY_USE_CASES = [
  {
    icon: Building2,
    title: 'Real Estate Inquiries',
    metric: '3.4x Faster Site Visits',
    desc: 'Filter 2BHK vs 3BHK buyers, qualify budget thresholds, and schedule weekend property walkthroughs directly on WhatsApp.',
  },
  {
    icon: ShoppingCart,
    title: 'E-Commerce Catalog & Support',
    metric: '68% Automated Resolution',
    desc: 'Answer delivery timelines, provide product stock availability, and share payment links without human intervention.',
  },
  {
    icon: CalendarCheck,
    title: 'Appointment Booking',
    metric: '94% Attendance Rate',
    desc: 'Sync real-time calendar availability, book consults, and dispatch automated SMS/WhatsApp reminder sequences.',
  },
  {
    icon: UserCheck,
    title: 'High-Ticket Sales Qualification',
    metric: '87 Lead Quality Score',
    desc: 'Score incoming leads dynamically; route buyers with intent > 80 directly to senior account managers in Omni-Inbox.',
  },
  {
    icon: CreditCard,
    title: 'Payment Recovery & Invoicing',
    metric: '42% Higher Collection',
    desc: 'Send automated invoice links, answer payment disputes, and confirm transaction receipts instantly.',
  },
];

export default async function DocsArticlePage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug.join('/');
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Find previous and next articles
  const allSlugs = ALL_DOC_SLUGS;
  const currentIndex = allSlugs.indexOf(slug);
  const prevSlug = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;
  const prevArticle = prevSlug ? getArticleBySlug(prevSlug) : null;
  const nextArticle = nextSlug ? getArticleBySlug(nextSlug) : null;

  // JSON-LD structured data for Google Search Breadcrumbs
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
        name: article.category,
        item: `https://orbionagents.com/docs#${article.category.toLowerCase().replace(/[\s&]+/g, '-')}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: article.title,
        item: `https://orbionagents.com/docs/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="w-full max-w-[1520px] mx-auto flex gap-10 xl:gap-14 justify-between items-start">
        {/* Main Article Content Container */}
        <article className="flex-1 min-w-0 max-w-5xl space-y-14 pb-20">
          {/* Article Header & Breadcrumbs */}
          <header className="space-y-5 border-b border-white/[0.08] pb-10">
            <nav className="flex items-center gap-2 text-xs text-zinc-400 font-medium px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/5 w-fit">
              <Link href="/docs" className="hover:text-white transition-colors">
                Docs
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-zinc-300">{article.category}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-violet-300 font-semibold truncate">
                {article.title}
              </span>
            </nav>

            <div className="flex items-center gap-2.5 pt-1">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30 uppercase tracking-wider font-mono">
                {article.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                Official Guide
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              {article.title}
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-normal">
              {article.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-400 pt-2 font-mono">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-violet-400" />
                <span>{article.readTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                <span>Updated {article.lastUpdated}</span>
              </div>
            </div>
          </header>

          {/* Section 1: What is it? (Contextually paired with an interface slot) */}
          <section id="what-is-it" className="space-y-5 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <span>What is it?</span>
              </h2>
            </div>
            
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
              {article.whatIsIt}
            </p>

            {/* Contextual Interface Screenshot Slot */}
            <div className="pt-2">
              <DocumentationScreenshot
                src={article.screenshots?.[0]?.src}
                alt={article.screenshots?.[0]?.alt || `${article.title} product interface`}
                caption={article.screenshots?.[0]?.caption || `${article.title}: Primary operational interface`}
                annotation="Product Overview"
              />
            </div>
          </section>

          {/* Section 2: Why use it? (Structured Benefit Cards) */}
          <section id="why-use-it" className="space-y-5 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Why use it?</span>
              </h2>
            </div>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal">
              {article.whyUseIt}
            </p>

            {/* Visual Benefit Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {BENEFIT_CARDS.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-white/[0.08] bg-[#080910]/80 hover:bg-[#0C0D18]/90 hover:border-violet-500/40 transition-all duration-300 space-y-2.5 shadow-lg shadow-black/40 backdrop-blur-md"
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shadow-sm">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {b.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {b.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Visual Workflow & Video Tutorial Slot */}
          <section id="how-it-works" className="space-y-6 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                <span>How It Works &amp; Architecture</span>
              </h2>
            </div>

            {/* Visual Workflow Canvas */}
            <DocumentationWorkflowVisualizer />

            {/* Contextual Video Tutorial Slot (Reinforces the section directly) */}
            <div className="pt-2">
              <DocumentationVideo
                video={article.video}
                title={`${article.title}: Guided Walkthrough`}
                duration={article.video?.duration || '1:45'}
                caption={article.video?.caption || `Visual video walkthrough demonstrating configuration and deployment of ${article.title}.`}
              />
            </div>
          </section>

          {/* Section 4: Before You Start (Prerequisites) */}
          <section id="before-you-start" className="space-y-5 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Before You Start</span>
              </h2>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#080910]/80 p-5 sm:p-6 space-y-3 shadow-lg shadow-black/40">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                Required Prerequisites:
              </span>
              {article.beforeYouStart.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Section 5: Step-by-Step Guide with Embedded Screenshot Slots */}
          <section id="step-by-step" className="space-y-6 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <span>Step-by-Step Guide</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Follow these operational steps. Each stage includes dedicated interface verification slots.
              </p>
            </div>

            <div className="space-y-5 pt-2">
              {article.steps.map((step) => (
                <DocsStepItem
                  key={step.step}
                  step={step}
                  totalSteps={article.steps.length}
                />
              ))}
            </div>
          </section>

          {/* Section 6: Real-World Industry Use Cases */}
          <section id="use-cases" className="space-y-5 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span>Real-World Industry Use Cases</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                How enterprise teams deploy this capability in real production environments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {INDUSTRY_USE_CASES.map((uc, i) => {
                const Icon = uc.icon;
                return (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-white/[0.08] bg-[#080910]/80 hover:bg-[#0C0D18]/90 hover:border-violet-500/40 transition-all duration-300 space-y-2.5 group shadow-lg shadow-black/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors shadow-sm">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                        {uc.metric}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                      {uc.title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {uc.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 7: Expected Result */}
          <section id="expected-result" className="space-y-4 scroll-mt-24">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Expected Result</span>
              </h2>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 sm:p-6 flex gap-3.5 shadow-lg shadow-black/40 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-200 leading-relaxed">
                <span className="font-bold block text-emerald-300 mb-1">
                  Verification Checklist:
                </span>
                {article.expectedResult}
              </div>
            </div>
          </section>

          {/* Section 8: Tips / Best Practices */}
          {article.tips && article.tips.length > 0 && (
            <section id="tips" className="space-y-4 scroll-mt-24">
              <div className="border-b border-white/[0.08] pb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span>Pro Tips &amp; Best Practices</span>
                </h2>
              </div>
              <div className="space-y-3 pt-1">
                {article.tips.map((tip, i) => (
                  <DocsAlert key={i} type="tip">
                    {tip}
                  </DocsAlert>
                ))}
              </div>
            </section>
          )}

          {/* Section 9: Troubleshooting */}
          {article.troubleshooting && article.troubleshooting.length > 0 && (
            <section id="troubleshooting" className="space-y-5 scroll-mt-24">
              <div className="border-b border-white/[0.08] pb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>Troubleshooting &amp; Common Issues</span>
                </h2>
              </div>

              <div className="space-y-3.5 pt-1">
                {article.troubleshooting.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-2xl border border-white/[0.08] bg-[#080910]/80 space-y-2.5 shadow-lg shadow-black/40"
                  >
                    <div className="flex items-start gap-2.5 text-amber-300 font-bold text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <span>{item.issue}</span>
                    </div>
                    <p className="text-xs text-zinc-300 pl-6 leading-relaxed">
                      <strong className="text-emerald-400 font-medium">Resolution: </strong>
                      {item.solution}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section 10: Previous / Next Navigation */}
          <footer className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
            {prevArticle ? (
              <Link
                href={`/docs/${prevArticle.slug}`}
                className="w-full sm:w-auto p-4.5 rounded-2xl border border-white/[0.08] bg-[#080910]/80 hover:bg-[#0C0D18]/90 hover:border-violet-500/40 flex items-center gap-3.5 transition-all group text-left shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 text-violet-400 group-hover:-translate-x-1.5 transition-transform" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block font-semibold">
                    Previous Guide
                  </span>
                  <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate max-w-[220px] block">
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
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block font-semibold">
                    Next Guide
                  </span>
                  <span className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors truncate max-w-[220px] block">
                    {nextArticle.title}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            )}
          </footer>
        </article>

        {/* Right Sticky Table of Contents (Desktop) */}
        <aside className="hidden xl:block w-72 shrink-0 sticky top-24 h-[calc(100vh-120px)] overflow-y-auto">
          <DocsTableOfContents
            sections={[
              { id: 'what-is-it', title: 'What is it?' },
              { id: 'why-use-it', title: 'Why use it?' },
              { id: 'how-it-works', title: 'How It Works' },
              { id: 'before-you-start', title: 'Before You Start' },
              { id: 'step-by-step', title: 'Step-by-Step Guide' },
              { id: 'use-cases', title: 'Real Use Cases' },
              { id: 'expected-result', title: 'Expected Result' },
              { id: 'tips', title: 'Pro Tips' },
              { id: 'troubleshooting', title: 'Troubleshooting' },
            ]}
          />
        </aside>
      </div>
    </>
  );
}


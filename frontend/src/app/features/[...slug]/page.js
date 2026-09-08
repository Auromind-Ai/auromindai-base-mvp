import { redirect } from 'next/navigation';

export default async function FeaturesSlugRedirect({ params }) {
  const resolvedParams = await params;
  const slugPath = resolvedParams?.slug ? (Array.isArray(resolvedParams.slug) ? resolvedParams.slug.join('/') : resolvedParams.slug) : '';
  redirect(`/docs/features/${slugPath}`);
}

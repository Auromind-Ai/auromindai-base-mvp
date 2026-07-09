'use client';

import dynamic from 'next/dynamic';

const NeuroHeroDynamic = dynamic(
  () => import('./NeuroHero'),
  { ssr: false }
);

export default function NeuroHeroClient() {
  return <NeuroHeroDynamic />;
}

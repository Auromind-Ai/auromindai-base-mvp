'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import CampaignDetailsView from '@/components/marketing/CampaignDetailsView';

export default function BulkMessageDetailsPage({ params: propParams }) {
  const routeParams = useParams();
  const campaignId = routeParams?.id || propParams?.id;

  if (!campaignId) {
    return (
      <div className="w-full min-h-[400px] flex items-center justify-center text-white/60 text-sm">
        No campaign ID specified
      </div>
    );
  }

  return <CampaignDetailsView campaignId={String(campaignId)} />;
}

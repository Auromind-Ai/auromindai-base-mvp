'use client';

import DocumentationScreenshot from '@/components/docs/DocumentationScreenshot';

export default function BrainDetailVisual() {
  return (
    <DocumentationScreenshot
      src="/images/doc-images/brain-overview.png"
      alt="AI Brain dashboard with knowledge totals, document upload, website sync, and indexed sources with Completed, Failed, and Processing statuses"
      aspectRatio="aspect-[3/2] [&_img]:object-contain"
      frameless
    />
  );
}

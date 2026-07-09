'use client';

import dynamic from 'next/dynamic';

const ManageChatsDynamic = dynamic(
  () => import('./ManagechatsSection'),
  { ssr: false }
);

export default function ManageChatsClient() {
  return <ManageChatsDynamic />;
}

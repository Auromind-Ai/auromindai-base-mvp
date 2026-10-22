import DocsClientLayout from '@/components/docs/DocsClientLayout';

export const metadata = {
  title: 'Orbion Agents Docs | Guides & Documentation',
};

export default function DocsLayout({ children }) {
  return <DocsClientLayout>{children}</DocsClientLayout>;
}

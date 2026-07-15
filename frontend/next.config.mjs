
import withBundleAnalyzer from '@next/bundle-analyzer';

const BACKEND_URL = process.env.BACKEND_URL || (process.env.VERCEL_ENV === 'production' ? 'https://app.orbionagents.com' : (process.env.VERCEL_ENV === 'preview' ? 'https://orbion-api-staging-900605000401.asia-south1.run.app' : 'http://127.0.0.1:8000'));

const nextConfig = {

    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    httpAgentOptions: {
        keepAlive: true,
    },
    compress: true,
    poweredByHeader: false,
    images: {
        formats: ['image/avif', 'image/webp'],
    },
    experimental: {
        optimizePackageImports: [
            'lucide-react',
            'framer-motion',
            'recharts',
            '@heroicons/react',
        ],
    },
    async headers() {
        return [
            {
                source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff2|woff|ttf)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/:all*(mp4)',
                headers: [
                    {
                        key: 'Accept-Ranges',
                        value: 'bytes',
                    },
                    {
                        key: 'Content-Type',
                        value: 'video/mp4',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/:all*(webm)',
                headers: [
                    {
                        key: 'Accept-Ranges',
                        value: 'bytes',
                    },
                    {
                        key: 'Content-Type',
                        value: 'video/webm',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                source: '/:all*(ogg)',
                headers: [
                    {
                        key: 'Accept-Ranges',
                        value: 'bytes',
                    },
                    {
                        key: 'Content-Type',
                        value: 'video/ogg',
                    },
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ];
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
            {
                source: '/ws/:path*',
                destination: `${BACKEND_URL}/ws/:path*`,
            },
        ];
    },
};

const withBundleAnalyzerConfig = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzerConfig(nextConfig);

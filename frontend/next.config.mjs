
let withBundleAnalyzer;
try {
    withBundleAnalyzer = (await import('@next/bundle-analyzer')).default;
} catch {
    withBundleAnalyzer = null;
}

const BACKEND_URL = process.env.BACKEND_URL || (process.env.VERCEL_ENV === 'production' ? 'https://api.orbionagents.com' : (process.env.VERCEL_ENV === 'preview' ? 'https://orbion-api-staging-900605000401.asia-south1.run.app' : 'http://127.0.0.1:8000'));

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
                source: '/:path*',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com; frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com https://calendar.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: https://*.razorpay.com; media-src 'self' blob: data: https:; font-src 'self' data: https: https://fonts.gstatic.com; connect-src 'self' http://localhost:8000 ws://localhost:8000 http://127.0.0.1:8000 ws://127.0.0.1:8000 https: wss: ws: http: https://api.razorpay.com https://lumberjack-cx.razorpay.com https://*.razorpay.com https://challenges.cloudflare.com;" },
                ],
            },
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
                source: '/api-proxy/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
            {
                source: '/ws/:path*',
                destination: `${BACKEND_URL}/ws/:path*`,
            },
        ];
    },
};

let finalConfig = nextConfig;
if (withBundleAnalyzer) {
    const withBA = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
    finalConfig = withBA(nextConfig);
}

export default finalConfig;

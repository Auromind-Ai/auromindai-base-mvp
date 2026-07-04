
const BACKEND_URL = process.env.BACKEND_URL || (process.env.VERCEL_ENV === 'production' ? 'https://orbion-api-900605000401.asia-south1.run.app' : (process.env.VERCEL_ENV === 'preview' ? 'https://orbion-api-staging-900605000401.asia-south1.run.app' : 'http://127.0.0.1:8000'));

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

export default nextConfig;
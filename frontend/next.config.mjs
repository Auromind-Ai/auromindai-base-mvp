/* @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   env: {
//     NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://playhouse-broker-gating.ngrok-free.dev',
//   },
// };

// export default nextConfig;






/* @type {import('next').NextConfig} */
const isLocal = true;
const BACKEND_URL = process.env.BACKEND_URL || process.env.BACKEND_INTERNAL_URL || 'http://localhost:8000';

const nextConfig = {

    reactStrictMode: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    httpAgentOptions: {
        keepAlive: true,
    },
    async rewrites() {
        return [
            {
                source: '/api/admin/:path*',
                destination: `${BACKEND_URL}/admin/:path*`,
            },
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
            {
                source: '/backend/:path*',
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
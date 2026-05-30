/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.API_URL || 'http://backend:8000';

const nextConfig = {

    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    httpAgentOptions: {
        keepAlive: true,
    },
    async rewrites() {
        const adminPath = process.env.NEXT_PUBLIC_ADMIN_CONSOLE_PATH || 'x7k2-admin-9pqm';
        return [
            {
                source: '/api/admin/:path*',
                destination: `${BACKEND_URL}/${adminPath}/:path*`,
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

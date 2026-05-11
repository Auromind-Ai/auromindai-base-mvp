/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.API_URL || 'http://backend:8000'; // ← localhost → backend

const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
            {
                source: '/backend/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
        ];
    },
};

export default nextConfig;
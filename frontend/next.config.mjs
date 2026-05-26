/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.API_URL || 'http://backend:8000';

const nextConfig = {

    reactStrictMode: true,
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

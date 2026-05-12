/** @type {import('next').NextConfig} */

const BACKEND_URL = process.env.API_URL || 'https://undeputized-fertilely-adelaida.ngrok-free.dev';

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
        ];
    },
};
export default nextConfig;
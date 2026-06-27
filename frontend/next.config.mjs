
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

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
                source: '/ws/:path*',
                destination: `${BACKEND_URL}/ws/:path*`,
            },
        ];
    },
};

export default nextConfig;
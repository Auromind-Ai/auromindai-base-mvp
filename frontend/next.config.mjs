/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_API_URL: BACKEND_URL,
    },
    /**
     * Same-origin proxy: browser → /api/* → Next.js server → backend.
     * This eliminates all browser CORS issues regardless of backend host
     * (ngrok, Render, localhost). The backend URL is never exposed to
     * the browser; only the Next.js origin is.
     */
    async rewrites() {
        return [
            {
                // Used by APIClient in lib/api.js.
                // Browser calls /api/<route> → backend gets /<route>
                // (paths do NOT include /api/ prefix in the backend router)
                source: '/api/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
            {
                // Used by pages that hit backend routes that already start
                // with /api/ (e.g. inbox: /api/conversations, /api/messages).
                // Browser calls /backend/<path> → backend gets /<path> intact.
                source: '/backend/:path*',
                destination: `${BACKEND_URL}/:path*`,
            },
        ];
    },
};

export default nextConfig;

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

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (isLocal
      ? 'http://localhost:8000'
      : 'https://playhouse-broker-gating.ngrok-free.dev'),
  },
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://localhost:8000/:path*',
      },
      {
        source: '/api/whatsapp/webhook',
        destination: 'http://localhost:8000/api/whatsapp/webhook',
      },
    ];
  },
};

export default nextConfig;
/** @type {import('next').NextConfig} */

// Development proxy target for /api/v1/* when the browser calls the Next.js origin.
// In production a reverse proxy (infrastructure/Caddyfile) routes /api/ to Django instead.
const devBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const nextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle used by infrastructure/frontend.Dockerfile.
  output: 'standalone',
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${devBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const internalApiUrl = process.env.API_INTERNAL_URL || 
      (process.env.NODE_ENV === 'production' ? 'http://sf-api:3001' : 'http://localhost:3001');
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

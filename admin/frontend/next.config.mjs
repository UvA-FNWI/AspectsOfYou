/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_DOTNET_API_URL: process.env.NEXT_PUBLIC_DOTNET_API_URL,
  },
  experimental: {
    serverActions: {},
  },
};

export default nextConfig;

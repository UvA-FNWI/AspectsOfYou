import path from "path";
import { fileURLToPath } from "url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: frontendRoot,
  },
  output: 'standalone',
  env: {
    NEXT_PUBLIC_DOTNET_API_URL: process.env.NEXT_PUBLIC_DOTNET_API_URL,
  },
  experimental: {
    serverActions: {},
  },
};

export default nextConfig;

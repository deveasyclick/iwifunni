/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  serverExternalPackages: ['@maily-to/core'],
};

export default nextConfig;

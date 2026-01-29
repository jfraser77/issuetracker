import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Your existing settings
  serverExternalPackages: ["mssql"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // New Azure optimization settings
  reactStrictMode: true,
  swcMinify: true,
  optimizeFonts: false,
  images: {
    unoptimized: true,
  },
  // Increase timeout for Azure
  staticPageGenerationTimeout: 1000,

  // Optional: Add output configuration for Azure
  output: "standalone", // Creates a standalone folder for deployment

  // Optional: Disable source maps in production
  productionBrowserSourceMaps: false,
};

export default nextConfig;

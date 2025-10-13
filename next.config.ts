import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Moved from experimental to root level
  serverExternalPackages: ["mssql"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

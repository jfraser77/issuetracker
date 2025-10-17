// next.config.js - NO CHANGES NEEDED
import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mssql"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
#!/bin/bash

echo "=== Azure Deployment Script ==="

# Force Node.js 20
export PATH=/opt/nodejs/20/bin:$PATH

# CRITICAL: Remove any existing node_modules.tar.gz
echo "Removing compressed node_modules..."
rm -f node_modules.tar.gz
rm -f /node_modules.tar.gz 2>/dev/null || true
rm -rf /node_modules 2>/dev/null || true

# Verify versions
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Clean install - NO TARBALL
echo "Cleaning previous node_modules..."
rm -rf node_modules
rm -f package-lock.json

# Fresh install
echo "Installing dependencies..."
npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

# Build
echo "Building application..."
NEXT_IGNORE_NODE_VERSION_CHECK=1 npm run build

# Remove any tar.gz that might have been created
rm -f node_modules.tar.gz

echo "=== Deployment Complete ==="
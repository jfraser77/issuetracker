#!/bin/bash

echo "=== Azure Deployment Script ==="

# Force Node.js 20
export PATH=/opt/nodejs/20/bin:$PATH

# Verify versions
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install dependencies
echo "Installing dependencies..."
npm install --omit=dev --legacy-peer-deps --ignore-engines --no-audit --no-fund

# Build
echo "Building application..."
NEXT_IGNORE_NODE_VERSION_CHECK=1 npm run build

echo "=== Deployment Complete ==="
#!/bin/bash
# Quick script to rebuild and republish with postinstall fix

set -e

echo "🔨 Building Arctic with fixed postinstall script..."
cd "$(dirname "$0")/.."

echo ""
echo "Step 1: Building binaries..."
bun ./script/build.ts

echo ""
echo "Step 2: Running smoke test..."
bun ./script/build.ts --single

echo ""
echo "✅ Build complete!"
echo ""
echo "Next step: Publish the package"
echo ""
echo "Run one of these commands:"
echo ""
echo "  # Publish to main tag (preview builds)"
echo "  bun ./script/publish.ts --publish --tag main"
echo ""
echo "  # Publish to beta tag"
echo "  bun ./script/publish.ts --publish --tag beta"
echo ""
echo "  # Publish to latest (stable release)"
echo "  bun ./script/publish.ts --publish --tag latest"
echo ""
echo "Note: You may need --otp=YOUR_2FA_CODE if you have 2FA enabled"
echo ""

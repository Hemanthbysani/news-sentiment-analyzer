#!/bin/bash

# DigitalOcean Deployment Script
# This script helps prepare and deploy the News Sentiment Analyzer

echo "🚀 Preparing News Sentiment Analyzer for DigitalOcean Deployment"
echo "================================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Project structure verified"

# Check for required files
echo "📋 Checking deployment files..."

if [ -f ".do/app.yaml" ]; then
    echo "✅ DigitalOcean app specification found"
else
    echo "❌ Missing .do/app.yaml"
    exit 1
fi

if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile found"
else
    echo "❌ Missing Dockerfile"
    exit 1
fi

if [ -f ".env.production" ]; then
    echo "✅ Environment template found"
else
    echo "❌ Missing .env.production"
    exit 1
fi

# Test build
echo "🔨 Testing production build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi

# Check health endpoint
echo "🩺 Testing health endpoint..."
npm run dev &
DEV_PID=$!
sleep 10

# Test health endpoint
HEALTH_STATUS=$(curl -s http://localhost:3000/api/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

# Kill dev server
kill $DEV_PID

if [ "$HEALTH_STATUS" = "healthy" ] || [ "$HEALTH_STATUS" = "unhealthy" ]; then
    echo "✅ Health endpoint responding"
else
    echo "⚠️  Health endpoint may have issues, but continuing..."
fi

echo ""
echo "🎉 Deployment Check Complete!"
echo "=============================="
echo ""
echo "Your repository is ready for DigitalOcean deployment!"
echo ""
echo "Next steps:"
echo "1. Push any remaining changes to GitHub"
echo "2. Go to https://cloud.digitalocean.com/apps"
echo "3. Create new app from your GitHub repository"
echo "4. Configure environment variables (see DEPLOYMENT.md)"
echo "5. Deploy!"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT.md"
echo ""

# Optional: Git status check
if git status --porcelain | grep -q .; then
    echo "⚠️  You have uncommitted changes. Consider committing them:"
    echo "   git add ."
    echo "   git commit -m 'Add deployment configuration'"
    echo "   git push origin main"
fi

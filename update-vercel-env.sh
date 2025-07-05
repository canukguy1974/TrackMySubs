#!/bin/bash

# Update Vercel environment variables for production domain
echo "🔧 Updating Vercel environment variables..."

# Update NEXT_PUBLIC_BASE_URL to production domain
vercel env add NEXT_PUBLIC_BASE_URL production
# When prompted, enter: https://digitalcreationswindsor.xyz

echo "✅ Environment variables updated!"
echo "🚀 Don't forget to redeploy to apply changes: vercel --prod"

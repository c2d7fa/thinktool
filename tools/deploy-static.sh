#!/usr/bin/env bash
set -e

# Deploy to Azure Storage and purge Cloudflare cache. Expects
# AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_KEY, CLOUDFLARE_TOKEN and CLOUDFLARE_ZONE
# to be set.

az storage blob upload-batch -s dist/static -d '$web' -o table

curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE/purge_cache" -H "Authorization: Bearer $CLOUDFLARE_TOKEN" -H 'Content-Type: application/json' --data '{"purge_everything": true}'

#!/usr/bin/env bash
set -e

# Deploy to Azure Storage. Expects AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY
# to be set.

az storage blob upload-batch -s dist/static -d '$web' -o table

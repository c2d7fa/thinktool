#!/usr/bin/env bash
# Requires 'entr'

cd app
while true; do
    find src -name "*.ts" -or -name "*.tsx" | entr -cd npx eslint . --ext .ts,.tsx --fix
done

#!/usr/bin/env bash
# Requires 'entr'

cd app
while true; do
    find src -name "*.ts" | entr -cd npx eslint . --ext .ts --fix
done

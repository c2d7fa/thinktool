#!/usr/bin/env bash

echo "Starting server..."
echo "(Note: If nothing happens, make sure MongoDB is running on mongodb://localhost:27017/.)"
cd dist/server
DIAFORM_PORT=8080 node server.js

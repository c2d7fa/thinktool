#!/bin/bash

docker build -t diaform .
mkdir -p ./data
docker run --rm -ti -p 8080:80 -v "$(pwd)/data:/app/data" diaform

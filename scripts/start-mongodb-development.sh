#!/bin/bash

docker run --name mongo-diaform -p 27017:27017 -v "$(pwd)/db":/data/db -d mongo

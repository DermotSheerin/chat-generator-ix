#!/bin/bash
docker kill chatgenerator > /dev/null 2>&1
docker rm chatgenerator > /dev/null 2>&1
docker-compose up -d
#!/usr/bin/env bash
set -e

go mod tidy
npm install
npm run build
go build -o main .

echo "built. run: ./main"
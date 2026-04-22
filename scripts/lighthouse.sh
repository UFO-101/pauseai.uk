#!/bin/bash
set -e

name=$1
url=$2

if [ "$name" = "branch" ]; then
  slug=$(git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9_-]/-/g' | tr '[:upper:]' '[:lower:]')
  url="https://pauseai.uk/preview/$slug/"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" != "200" ]; then
    echo "No preview found at $url (HTTP $status)"
    exit 1
  fi
fi

sha=$(git rev-parse --short HEAD)
ts=$(date +%Y-%m-%dT%H-%M-%S)
out="lighthouse-reports/${name}-${sha}-${ts}"
mkdir -p lighthouse-reports
npx lighthouse "$url" --output=html --output=json --output-path="$out" --view

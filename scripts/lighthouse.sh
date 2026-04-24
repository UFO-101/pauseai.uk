#!/bin/bash
set -e

name=$1

pick_page() {
  local pages=("/")
  local file dir

  while IFS= read -r file; do
    dir="${file#site}"
    dir="${dir%index.html}"
    pages+=("$dir")
  done < <(find site -mindepth 2 -maxdepth 2 -name "index.html" | sort)

  if [ ${#pages[@]} -eq 1 ]; then
    echo "/"
    return
  fi

  echo "" >&2
  echo "Select a page:" >&2
  for i in "${!pages[@]}"; do
    echo "  $((i+1))) ${pages[$i]}" >&2
  done
  echo "" >&2
  read -rp "Enter number [1]: " choice </dev/tty
  choice=${choice:-1}

  if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#pages[@]}" ]; then
    echo "${pages[$((choice-1))]}"
  else
    echo "Invalid selection, using /" >&2
    echo "/"
  fi
}

if [ "$name" = "pick" ]; then
  pick_page
  exit 0
fi

if [ "$name" = "branch" ]; then
  path=${2:-$(pick_page)}
  slug=$(git rev-parse --abbrev-ref HEAD | sed 's/[^a-zA-Z0-9_-]/-/g' | tr '[:upper:]' '[:lower:]')
  url="https://pauseai.uk/preview/$slug${path}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" != "200" ]; then
    echo "No preview found at $url (HTTP $status)"
    exit 1
  fi
else
  base=$2
  path=${3:-$(pick_page)}
  url="${base%/}${path}"
fi

sha=$(git rev-parse --short HEAD)
ts=$(date +%Y-%m-%dT%H-%M-%S)
out="lighthouse-reports/${name}-${sha}-${ts}"
mkdir -p lighthouse-reports
npx lighthouse "$url" --output=html --output=json --output-path="$out" --view

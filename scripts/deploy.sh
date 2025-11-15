#!/usr/bin/env bash
set -euo pipefail

remote="origin"
branch="gh-pages"
prefix="site"
force=false
allow_dirty=false

usage() {
  cat <<EOF
Deploy the contents of '$prefix/' to the '$branch' branch on '$remote'.

Usage: $(basename "$0") [options]

Options:
  -r, --remote <name>        Remote name (default: origin)
  -b, --branch <name>        Deploy branch (default: gh-pages)
  -p, --prefix <path>        Subdirectory to publish (default: site)
  -f, --force                Force push (uses split + push -f)
      --allow-dirty          Skip clean working tree check
  -h, --help                 Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -r|--remote) remote="$2"; shift 2;;
    -b|--branch) branch="$2"; shift 2;;
    -p|--prefix) prefix="$2"; shift 2;;
    -f|--force) force=true; shift;;
    --allow-dirty) allow_dirty=true; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1;;
  esac
done

if [[ ! -d .git ]]; then
  echo "Error: must run from the repo root (no .git found)" >&2
  exit 1
fi

if [[ ! -d "$prefix" ]]; then
  echo "Error: prefix directory '$prefix' not found" >&2
  exit 1
fi

if ! $allow_dirty; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: working tree not clean. Commit or stash changes, or pass --allow-dirty." >&2
    exit 1
  fi
fi

echo "Deploying '$prefix/' to '$remote/$branch'..."

if $force; then
  tmp_branch="__deploy_${branch}_$(date +%s)"
  echo "Creating split branch '$tmp_branch' from '$prefix/'..."
  git subtree split --prefix "$prefix" -b "$tmp_branch"
  echo "Pushing to $remote/$branch with --force..."
  git push -f "$remote" "$tmp_branch:$branch"
  echo "Cleaning up temporary branch..."
  git branch -D "$tmp_branch"
else
  echo "Pushing via git subtree push (no force)..."
  git subtree push --prefix "$prefix" "$remote" "$branch"
fi

echo "Done. GitHub Pages will serve from '$branch' if configured."


#!/bin/bash
set -e

# Pick the page before starting the server so the prompt isn't
# interrupted by the server's startup output.
path=$(bash scripts/lighthouse.sh pick)

npx start-server-and-test 'npx serve site -p 3001' http://localhost:3001 \
  "bash scripts/lighthouse.sh dev http://localhost:3001 $path"

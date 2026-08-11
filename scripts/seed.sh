#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/lms-school
export PATH="/home/ubuntu/.local/node/node-v20.20.2-linux-x64/bin:$PATH"
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db push --accept-data-loss
./node_modules/.bin/ts-node prisma/seed.ts

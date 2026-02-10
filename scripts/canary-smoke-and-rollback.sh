#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "VERCEL_TOKEN is required."
  exit 1
fi

if [[ -z "${VERCEL_PROJECT_ID:-}" ]]; then
  echo "VERCEL_PROJECT_ID is required."
  exit 1
fi

API_BASE="https://api.vercel.com"
MAX_POLLS="${CANARY_MAX_POLLS:-36}"
POLL_INTERVAL_SECONDS="${CANARY_POLL_INTERVAL_SECONDS:-10}"
SMOKE_SPECS="${CANARY_SMOKE_SPECS:-e2e/landing.spec.ts e2e/chat.spec.ts}"

echo "Fetching latest production deployments for project ${VERCEL_PROJECT_ID}..."
LIST_JSON="$(curl -fsSL \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "${API_BASE}/v6/deployments?projectId=${VERCEL_PROJECT_ID}&target=production&limit=8")"

LATEST_ID="$(printf '%s' "${LIST_JSON}" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const first=data.deployments?.[0]; process.stdout.write(first?.uid||'');")"
LATEST_URL="$(printf '%s' "${LIST_JSON}" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const first=data.deployments?.[0]; process.stdout.write(first?.url||'');")"
PREVIOUS_READY_URL="$(printf '%s' "${LIST_JSON}" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); const deps=data.deployments||[]; const first=deps[0]; const previous=deps.find((d)=>d.uid!==first?.uid && d.readyState==='READY'); process.stdout.write(previous?.url||'');")"

if [[ -z "${LATEST_ID}" || -z "${LATEST_URL}" ]]; then
  echo "Could not resolve latest production deployment."
  exit 1
fi

echo "Latest deployment: ${LATEST_ID} (${LATEST_URL})"

READY_STATE=""
for ((i=1; i<=MAX_POLLS; i++)); do
  DEPLOY_JSON="$(curl -fsSL \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    "${API_BASE}/v13/deployments/${LATEST_ID}")"
  READY_STATE="$(printf '%s' "${DEPLOY_JSON}" | node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(0,'utf8')); process.stdout.write(data.readyState||'');")"

  if [[ "${READY_STATE}" == "READY" ]]; then
    echo "Deployment is READY."
    break
  fi
  if [[ "${READY_STATE}" == "ERROR" || "${READY_STATE}" == "CANCELED" ]]; then
    echo "Deployment failed with state: ${READY_STATE}"
    exit 1
  fi

  echo "Waiting for deployment readiness (${i}/${MAX_POLLS}) current=${READY_STATE:-unknown}..."
  sleep "${POLL_INTERVAL_SECONDS}"
done

if [[ "${READY_STATE}" != "READY" ]]; then
  echo "Timed out waiting for deployment readiness."
  exit 1
fi

export PLAYWRIGHT_BASE_URL="https://${LATEST_URL}"
echo "Running smoke tests against ${PLAYWRIGHT_BASE_URL}"

set +e
pnpm test:e2e -- ${SMOKE_SPECS}
SMOKE_EXIT=$?
set -e

if [[ ${SMOKE_EXIT} -eq 0 ]]; then
  echo "Canary smoke checks passed."
  exit 0
fi

echo "Canary smoke checks failed."

if [[ -n "${PREVIOUS_READY_URL}" ]]; then
  echo "Attempting rollback to previous READY deployment: ${PREVIOUS_READY_URL}"
  if [[ -n "${VERCEL_SCOPE:-}" ]]; then
    npx vercel rollback "https://${PREVIOUS_READY_URL}" --token "${VERCEL_TOKEN}" --scope "${VERCEL_SCOPE}"
  else
    npx vercel rollback "https://${PREVIOUS_READY_URL}" --token "${VERCEL_TOKEN}"
  fi
else
  echo "Rollback skipped (no previous READY deployment found)."
fi

exit ${SMOKE_EXIT}

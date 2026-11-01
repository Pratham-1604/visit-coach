#!/usr/bin/env bash
# Fresh start for a demo take: wipes every visit, packet, audio, translation and checklist upload on the
# live VisitCoach, and brings back the seeded demo data (5 schools, checklist version 1 only).
# The data lives in SQLite inside the Cloud Run container, so a new revision (new container) starts clean.
# Run from Git Bash:   bash reset-demo-data.sh
# Local copy instead:  bash reset-demo-data.sh --local   (stop the local server first)
set -euo pipefail

PROJECT="${PROJECT:-ai-builder-cup-512011}"
REGION="${REGION:-asia-south1}"
SERVICE="${SERVICE:-visitcoach}"

if [ "${1:-}" = "--local" ]; then
  cd "$(dirname "$0")"
  if [ ! -d backend/data ]; then
    echo "Already clean."
    exit 0
  fi
  echo "This will delete backend/data (local database, voice notes, audio, translations):"
  ls backend/data | sed 's/^/  /'
  read -r -p "Type yes to delete: " ANSWER
  [ "$ANSWER" = "yes" ] || { echo "Cancelled."; exit 1; }
  rm -rf backend/data
  echo "Done. Start the server again to reseed, and open the app in a NEW incognito window."
  exit 0
fi

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.url)')"
REVISION="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format 'value(status.latestReadyRevisionName)')"

echo "This will wipe all live data on $URL (now $REVISION) and reseed the demo data."
read -r -p "Type yes to reset: " ANSWER
[ "$ANSWER" = "yes" ] || { echo "Cancelled."; exit 1; }

# Any env change makes a new revision; the timestamp makes sure the value is new every time.
gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --update-env-vars "DEMO_RESET=$(date +%s)" --quiet

# Check: the state admin sees only checklist version 1, the mentor sees 3 schools.
login() {
  curl -s -X POST "$URL/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"username\": \"$1\", \"password\": \"$2\"}" | grep -o '"token": *"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/'
}
ADMIN="$(login admin admin123)"
MENTOR="$(login sachin sachin123)"
VERSIONS="$(curl -s -H "Authorization: Bearer $ADMIN" "$URL/api/checklists" | grep -o '"items_count"' | wc -l)"
SCHOOLS="$(curl -s -H "Authorization: Bearer $MENTOR" "$URL/api/schools" | grep -o '"pct_reading_beginner"' | wc -l)"
echo "Checklist versions: $VERSIONS (expect 1). Mentor's schools: $SCHOOLS (expect 3)."
echo "Done. Open $URL in a NEW incognito window."

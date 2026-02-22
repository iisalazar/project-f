#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-osm-pbf>" >&2
  echo "Example: $0 maps/philippines-latest.osm.pbf" >&2
  exit 1
fi

PBF_PATH="$1"

if [[ ! -f "$PBF_PATH" ]]; then
  echo "File not found: $PBF_PATH" >&2
  exit 1
fi

mkdir -p data/osrm maps

# Newer osrm-extract versions don't support -o.
# Copy the selected PBF into /data with a stable name so outputs are /data/map.osrm*.
cp "$PBF_PATH" data/osrm/map.osm.pbf

docker run --rm -t \
  -v "$PWD/data/osrm:/data" \
  ghcr.io/project-osrm/osrm-backend:latest \
  osrm-extract -p /opt/car.lua /data/map.osm.pbf

docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest \
  osrm-partition /data/map.osrm

docker run --rm -t -v "$PWD/data/osrm:/data" ghcr.io/project-osrm/osrm-backend:latest \
  osrm-customize /data/map.osrm

echo "OSRM preprocessing complete: data/osrm/map.osrm"

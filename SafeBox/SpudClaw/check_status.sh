#!/bin/bash

echo "Waiting 10 seconds for SpudClaw to initialize..."
sleep 10

echo "Checking SpudClaw UI on port 18789..."
if curl -s http://localhost:18789 > /dev/null; then
  echo "Success: SpudClaw is listening on port 18789"
else
  echo "Failure: SpudClaw UI is not responding on port 18789"
  exit 1
fi

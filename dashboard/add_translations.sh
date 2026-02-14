#!/bin/bash

# Script to add useTranslation hook to all page components

PAGES=(
  "Login"
  "Tickets"
  "Users"
  "Giveaways"
  "BotSettings"
  "AuditLogs"
  "Transcripts"
  "AI"
  "StaffVerification"
  "WelcomeSetup"
)

for page in "${PAGES[@]}"; do
  FILE="/home/ubuntu/Supreme-BOT2/dashboard/src/pages/${page}.jsx"
  
  if [ -f "$FILE" ]; then
    # Check if useTranslation is already imported
    if ! grep -q "useTranslation" "$FILE"; then
      echo "Adding translation to $page..."
      
      # Add import if not exists
      if grep -q "^import.*from 'react'" "$FILE"; then
        sed -i "/^import.*from 'react'/a import { useTranslation } from 'react-i18next';" "$FILE"
      else
        sed -i "1i import { useTranslation } from 'react-i18next';" "$FILE"
      fi
      
      echo "✓ Added import to $page"
    else
      echo "✓ $page already has useTranslation"
    fi
  else
    echo "✗ $FILE not found"
  fi
done

echo "Done!"

#!/bin/bash

echo "🔍 Finding all API routes that need dynamic export..."

# Find all route files in app/api
find app/api -name "route.ts" -o -name "route.js" | while read file; do
  # Check if file uses environment variables
  if grep -q "process\.env" "$file"; then
    # Check if dynamic export already exists
    if ! grep -q "export const dynamic" "$file"; then
      echo "📝 Adding dynamic export to $file"
      # Create backup
      cp "$file" "$file.bak"
      # Add dynamic export at top
      { echo "export const dynamic = 'force-dynamic';"; echo ""; cat "$file"; } > "$file.tmp"
      mv "$file.tmp" "$file"
    else
      echo "✅ Already has dynamic export: $file"
    fi
  fi
done

echo "✅ Done! All API routes updated."
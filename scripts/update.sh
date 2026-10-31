#!/bin/bash
# update.sh — Push OTA update ke semua user tanpa perlu download ulang APK
# Usage: ./update.sh [preview|production] "pesan update"

CHANNEL="${1:-preview}"
MESSAGE="${2:-update}"

echo "🔄 Publishing OTA update to channel: $CHANNEL"
echo "   Message: $MESSAGE"
echo ""

# Push update
eas update --channel "$CHANNEL" --message "$MESSAGE" --non-interactive

echo ""
echo "✅ OTA update published!"
echo "   Users akan mendapat update otomatis saat buka app."
echo ""
echo "   Cek status: eas update:list"

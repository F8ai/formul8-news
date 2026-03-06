#!/bin/bash

echo "🔬 PubMed Historical Backfill"
echo "============================="
echo ""
echo "This will fetch ALL cannabis research articles from PubMed."
echo ""
echo "Options:"
echo "  1. Recent years (2020-2025) - ~5,000 articles, ~10 minutes"
echo "  2. Last decade (2015-2025) - ~15,000 articles, ~30 minutes"
echo "  3. Modern era (2000-2025) - ~30,000 articles, ~1 hour"
echo "  4. All available (1970-2025) - ~50,000+ articles, ~2 hours"
echo "  5. Custom range"
echo ""
read -p "Select option (1-5): " option

case $option in
  1)
    START_YEAR=2020
    END_YEAR=2025
    ;;
  2)
    START_YEAR=2015
    END_YEAR=2025
    ;;
  3)
    START_YEAR=2000
    END_YEAR=2025
    ;;
  4)
    START_YEAR=1970
    END_YEAR=2025
    ;;
  5)
    read -p "Start year: " START_YEAR
    read -p "End year: " END_YEAR
    ;;
  *)
    echo "Invalid option"
    exit 1
    ;;
esac

echo ""
echo "📅 Fetching articles from $START_YEAR to $END_YEAR"
echo ""
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ]; then
  echo "Cancelled"
  exit 0
fi

echo ""
echo "🚀 Starting backfill..."
echo "   This will run in the background and log to pubmed-backfill.log"
echo ""

node backfill-pubmed-all-years.mjs $START_YEAR $END_YEAR 2>&1 | tee pubmed-backfill.log

echo ""
echo "✅ Backfill complete! Check pubmed-backfill.log for details."

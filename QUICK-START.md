# Quick Start — LiFePO4 Mining PoC

## 5-Minute Setup

### 1. Clone & Install
```bash
cd /home/claude/lifepo4-sources
npm install
```

### 2. Test Chemistry Detector
```bash
npm test
```

Expected: 6+ of 7 tests passing (verifies LiFePO4 detection works)

### 3. Mine Camperforum.nl (No Auth Needed)
```bash
npm run mine:camperforum-only
```

This will:
- Search Camperforum.nl for LiFePO4 threads
- Extract Q&A pairs
- Save to `lifepo4-qa-YYYY-MM-DD.json`

Expected time: 5–10 minutes (respects rate limits)  
Expected output: 10–40 Q&A pairs

### 4. Validate Results
```bash
npm run validate
```

Expected: JSON validation passes, shows acceptance/rejection stats

---

## Optional: Add Reddit Mining

**If you want to also mine Reddit, first set up credentials:**

1. Go to https://www.reddit.com/prefs/apps
2. Create new "script" app
3. Export environment variables:
   ```bash
   export REDDIT_CLIENT_ID="your_id"
   export REDDIT_CLIENT_SECRET="your_secret"
   export REDDIT_REFRESH_TOKEN="your_token"
   ```

4. Run full mining:
   ```bash
   npm run mine
   ```

---

## File Structure After Running

```
/mnt/user-data/outputs/
└── lifepo4-qa-2026-04-04.json     ← Your mining results
```

## Output Example

```json
{
  "metadata": {
    "generated_at": "2026-04-04T14:30:00Z",
    "version": "2.0-PoC",
    "sources": ["Camperforum.nl"],
    "stats": {
      "total_pairs": 23,
      "camperforum": {
        "extracted": 32,
        "accepted": 23
      }
    }
  },
  "data": [
    {
      "question": "Hoe laad ik mijn LiFePO4 batterij het best op?",
      "answer": "Gebruik altijd een dedicated LiFePO4 charger...",
      "source": "Camperforum.nl",
      "chemistry": "LiFePO4",
      "confidence": 0.85,
      "extracted_at": "2026-04-04T14:30:00Z"
    }
  ]
}
```

---

## Troubleshooting

### "Cannot find module 'cheerio'"
```bash
npm install
```

### "Error: ECONNREFUSED camperforum.nl"
- Check internet connection
- Camperforum.nl might be down temporarily
- Try again in a few minutes

### Low acceptance rate
- Camperforum content might not be LiFePO4-focused enough
- Chemistry filters are intentionally strict (quality > quantity)
- Try Reddit mining instead

---

## What's Being Tested

✅ **Chemistry Filtering**
- Correctly identifies LiFePO4 vs. lead-acid, LiPo, NMC
- Rejects generic lithium without LiFePO4 confirmation

✅ **Web Scraping Pattern**
- Fetches real forum data
- Parses HTML correctly
- Respects rate limits

✅ **Output Quality**
- Valid JSON structure
- Confidence scores in 0–1 range
- Required metadata fields present

---

## Next Steps (If PoC Works)

1. **Add German forum scraper** (e.g., Photovoltaikforum.de)
2. **Deploy API** on Cloudflare Workers
3. **Integrate with SOLARIS** (lifepo4calculator.com)
4. **Scale to 10+ global forums**

---

**Questions?** See full README.md or check individual scraper files.

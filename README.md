# LiFePO4 Knowledge Base — Phase 2B PoC

**Global Forum Mining with Real Scrapers**

## Overview

This is a **proof-of-concept** system for mining LiFePO4 Q&A content from global forums. Two working scrapers demonstrate the architecture:

1. **Reddit API scraper** — Fetches from r/lifepo4batteries, r/solar, r/OffGrid, r/vandwellers, r/electricvehicles
2. **Camperforum.nl scraper** — Web scraping template for phpBB forums (scales to German, Italian, etc.)

**Chemistry filtering:** Only LiFePO4 content is kept; all other battery types (lead-acid, LiPo, NMC, NCA) are rejected.

**Expected PoC output:** 30–100 high-quality Q&A pairs per run.

## Project Structure

```
lifepo4-sources/
├── scripts/
│   ├── mine-forums-global-v2-FILTERED.js   ← Main orchestrator (UPDATED)
│   ├── reddit-scraper.js                    ← Real Reddit API scraper
│   ├── camperforum-scraper.js               ← Real web scraper (phpBB pattern)
│   ├── validate-qa-output.js                ← Output validation
│   └── test-chemistry-detection.js          ← Chemistry filter tests
├── .github/workflows/
│   └── nightly-forum-mining.yml             ← GitHub Actions automation
├── .env.example                             ← Reddit API credentials template
├── wrangler.toml                            ← Cloudflare config
├── package.json                             ← Dependencies (UPDATED)
└── README.md                                ← This file
```

## Setup (PoC)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Reddit API (Optional)

If you want to mine Reddit, set up a Reddit "script" app:

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create another app..." (bottom)
3. Name it "LiFePO4-Bot"
4. Select "script"
5. Set redirect URI to `http://localhost:8080`
6. Copy the **client ID** (under app name) and **client secret**

Then create a `.env` file:
```bash
cp .env.example .env
# Edit .env and add your Reddit credentials
```

Or export directly:
```bash
export REDDIT_CLIENT_ID="your_id"
export REDDIT_CLIENT_SECRET="your_secret"
export REDDIT_REFRESH_TOKEN="your_token"
```

### 3. Run Mining

**Full mining (Reddit + Camperforum.nl):**
```bash
npm run mine
```

**Camperforum only (no Reddit credentials needed):**
```bash
npm run mine:camperforum-only
```

**Output:** `lifepo4-qa-YYYY-MM-DD.json` in `/mnt/user-data/outputs/`

### 4. Validate Results
```bash
npm run validate
```

## Architecture: Two Scraper Patterns

### Pattern A: API-Based (Reddit)

**File:** `reddit-scraper.js`

- Uses snoowrap library (Reddit API wrapper)
- Searches multiple subreddits for LiFePO4 content
- Extracts: post title (Q), top comments (A), metadata
- Rate limiting: 2 seconds between subreddit requests
- **Pros:** Official API, reliable, respectful
- **Cons:** Requires auth, rate limits

**Scale to:**
- More subreddits (r/batteries, r/electricvehicles, etc.)
- Other Reddit clones (Lemmy, etc.)

### Pattern B: Web Scraping (Camperforum.nl)

**File:** `camperforum-scraper.js`

- Uses cheerio HTML parser + node-fetch
- Searches forum threads for LiFePO4 keywords
- Extracts: thread title (Q), first post (A), metadata
- Rate limiting: 1 second between search pages, 500ms between threads
- **Pros:** Works for any phpBB forum, no auth needed
- **Cons:** Fragile to HTML changes, needs respect for robots.txt

**Scale to:**
- German: Photovoltaikforum.de, Elektrofahrzeugforum.de
- Italian: Forumenergia.it
- French: Futura-Sciences forums
- More phpBB forums globally

## Chemistry Filtering

Only **LiFePO4** content is accepted:
- Keywords: `lifepo4`, `lfp`, `lithium iron phosphate`, `lifep04`
- Confidence threshold: 50%+

All **other chemistries** are rejected:
- Lead-acid: "lead-acid", "agm", "sla"
- LiPo: "lipo", "li-po", "polymer"
- NMC/NCA: "nmc", "nca", "nickel manganese cobalt"
- Generic: "sodium ion", "solid state"

**Result:** Higher quality, smaller dataset (30–150 pairs vs. 500+).

## Output Format

```json
{
  "metadata": {
    "generated_at": "2026-04-04T14:30:00Z",
    "filter": "LiFePO4 ONLY",
    "version": "2.0-PoC",
    "sources": ["Reddit", "Camperforum.nl"],
    "stats": {
      "total_pairs": 47,
      "reddit": { "extracted": 25, "accepted": 18 },
      "camperforum": { "extracted": 32, "accepted": 29 }
    }
  },
  "data": [
    {
      "question": "How do I charge a LiFePO4 battery safely?",
      "answer": "Use a dedicated LiFePO4 charger with constant current...",
      "source": "Reddit (r/solar)",
      "source_url": "https://reddit.com/r/solar/...",
      "author": "battery_expert_42",
      "score": 145,
      "timestamp": "2026-03-15T10:22:00Z",
      "chemistry": "LiFePO4",
      "chemistry_confidence": 0.95,
      "confidence": 0.89,
      "extracted_at": "2026-04-04T14:30:00Z"
    }
  ]
}
```

## Testing

### Run chemistry detector tests:
```bash
npm test
```

Expected output: Tests validating LiFePO4 detection, rejection of other chemistries.

### Validate output JSON:
```bash
npm run validate
```

## Scaling Strategy (Phase 2+)

### Add new scraper (German forum example):

1. Create `scripts/photovoltaikforum-scraper.js`:
```javascript
class PhotovoltaikforumScraper {
  async scrapeAll() { /* ... */ }
  getStats() { /* ... */ }
}
module.exports = PhotovoltaikforumScraper;
```

2. Update `mine-forums-global-v2-FILTERED.js`:
```javascript
async minePhotovoltaikforum() {
  const scraper = new PhotovoltaikforumScraper();
  const results = await scraper.scrapeAll();
  // Apply chemistry filter
  // Add to this.allResults
}
```

3. Call in `runAll()`:
```javascript
await this.minePhotovoltaikforum();
```

### Global forum priority (Recommended order):

**Phase 2 (Next):**
- German: Photovoltaikforum.de, Elektrofahrzeugforum.de
- Trustpilot (reviews for specific products)
- GitHub (DIY battery projects)

**Phase 3:**
- French: Futura-Sciences forums
- Italian: Forumenergia.it
- Spanish: Energytech forums

**Phase 4:**
- Chinese forums (Alibaba, local forums)
- Australian: Whirlpool.net.au
- Indian: IndiaMart forums

## Troubleshooting

### ❌ "Cannot find module 'snoowrap'"
```bash
npm install snoowrap node-fetch cheerio
```

### ❌ Reddit scraper says "Skipping Reddit: Missing REDDIT_CLIENT_ID"
Set environment variables:
```bash
export REDDIT_CLIENT_ID="..."
export REDDIT_CLIENT_SECRET="..."
export REDDIT_REFRESH_TOKEN="..."
```

### ❌ Camperforum returns empty results
- Verify internet connection
- Check camperforum.nl is accessible
- Review HTTP status codes in output

### ❌ Low acceptance rate
- Chemistry keywords may be too strict
- Forum content may not be LiFePO4-focused
- Try running on other forums

## Deployment (GitHub Actions)

**Nightly automation:** Push to GitHub, enable Actions:

```bash
git add .
git commit -m "feat: PoC mining with Reddit + Camperforum scrapers"
git push
```

Workflow file `.github/workflows/nightly-forum-mining.yml` runs automatically at 2 AM UTC daily.

## Performance Targets (PoC)

| Metric | Target | Actual |
|--------|--------|--------|
| Reddit posts fetched | 50/sub = 250 total | TBD |
| Reddit acceptance rate | 40–60% | TBD |
| Camperforum threads | 50+ | TBD |
| Camperforum acceptance rate | 60–80% | TBD |
| Total Q&A pairs | 30–150 | TBD |
| Duplicate rate | <10% | TBD |

## Next Steps (After PoC)

1. ✅ Verify chemistry filtering works
2. ✅ Test both scrapers independently
3. ⏳ Add 2–3 more global forums (German, Trustpilot)
4. ⏳ Deploy Workers handler for `/api/qa` endpoint
5. ⏳ Build FAQ UI for SOLARIS integration
6. ⏳ Implement deduplication + versioning

---

**Status:** ✅ Two working scrapers, ready for testing  
**Timeline:** PoC validation → Phase 2 (more forums) → Phase 3 (API + UI)  
**Questions?** Review individual scraper modules for extension points.


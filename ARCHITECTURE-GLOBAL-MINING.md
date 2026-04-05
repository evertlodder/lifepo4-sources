# Global LiFePO4 Forum Mining Architecture — Phase 2B

## Overview

**Complete worldwide LiFePO4 Q&A mining from 50+ global sources.**

This system extends Phase 2A with:
- **Global forum registry** (50+ curated sources, tiered by priority)
- **Modular scrapers** for different forum architectures
- **Multi-source orchestration** (Reddit API + web scrapers + future integrations)
- **Chemistry-first filtering** (LiFePO4 only)

Expected output: **200–500 high-confidence Q&A pairs** per cycle across all regions.

---

## Architecture

### Layer 1: Forum Registry (`data/forums-registry.js`)

Metadata-driven registry of 50+ LiFePO4 sources organized by:

**Tier 1 — High Volume (API Available)**
- Reddit (8 subreddits, PRAW/OAuth2)

**Tier 2 — Active Communities (Web Scraping)**
- DIY Solar Forum (US)
- Photovoltaikforum (Germany/Austria/Switzerland)
- EV-Forums.nl (Netherlands/Benelux)
- iRV2 (North America)

**Tier 3 — Niche Expertise**
- Endless Sphere (EV/battery)
- Elektrofahrzeugforum (German EV)
- Futura-Sciences (French science)

**Tier 4 — Reviews & Platforms**
- Amazon Reviews
- Trustpilot
- GitHub Discussions

**Tier 5 — Difficulty High (Future)**
- Chinese forums (CATL, BYD)
- YouTube comments
- Manufacturer forums

Each registry entry includes:
```javascript
{
  name: 'Forum Name',
  type: 'phpBB | api | custom | review | social',
  language: 'en | de | fr | nl | it | es | zh',
  regions: ['Germany', 'Austria'],
  selectors: { post, title, content, author },
  api: 'API type or none',
  rateLimit: 'requests per minute',
  notes: 'Special handling notes'
}
```

### Layer 2: Modular Scrapers

#### 2A: `scraper-reddit.js` — Reddit API Scraper

**Protocol:** OAuth2 (requires client ID + secret)

**Features:**
- Multi-subreddit mining (r/lifepo4batteries, r/solar, r/vandwellers, etc.)
- Full thread + comments extraction
- Automatic re-authentication

**Usage:**
```bash
REDDIT_CLIENT_ID=xxx REDDIT_CLIENT_SECRET=yyy node scripts/mine-global-forums-v3.js
```

#### 2B: `scraper-forums-web.js` — Web Scraper Framework

**Base class:** `ForumWebScraper`
- Cheerio-based HTML parsing
- Automatic rate limiting (2-3 sec between requests)
- Respect robots.txt

**Specialized subclasses:**
- `DIYSolarForumScraper` — diysolarforum.com
- `PhotovoltaikforumScraper` — photovoltaikforum.de (German)
- `EVForumsNLScraper` — ev-forums.nl (Dutch)
- `EndlessSphereScraper` — endless-sphere.com

Each implements forum-specific CSS selectors:
```javascript
selectors: {
  post: 'div.post',           // Post container
  title: 'h3.post-title',     // Question/title
  content: 'div.post-content',// Answer/response
  author: 'span.author',      // Poster name
  date: 'span.date'           // Post timestamp
}
```

**Pagination:** Auto-detects and follows next pages (default: max 3 pages/keyword)

### Layer 3: Chemistry Detection & Q&A Extraction

**Reused from Phase 2A:**
- `ChemistryDetector` — Filters LiFePO4 only
- `QAExtractor` — Parses forum posts into Q&A pairs

**Order of operations:**
1. Scraper fetches content (post title + body/comments)
2. ChemistryDetector confirms LiFePO4 content
3. If LiFePO4, QAExtractor finds Q&A patterns
4. Results tagged with: source, language, region, confidence

### Layer 4: Orchestrator (`mine-global-forums-v3.js`)

**Main class:** `GlobalForumMiner`

**Pipeline:**
```
1. Initialize scrapers (Reddit + web)
2. Mine Reddit (all 8 subreddits)
3. Mine Web Forums (5 sources × 3 keywords × 3 pages)
4. Mine GitHub (placeholder for future)
5. Aggregate + chemistry filter
6. Save JSON output
7. Print global statistics
```

**Output:**
```json
{
  "metadata": {
    "generated_at": "2026-04-04T02:15:00Z",
    "mining_version": "3.0-global",
    "coverage": [
      "Reddit (global)",
      "DIY Solar Forum (US)",
      "Photovoltaikforum (Germany/Austria/Switzerland)",
      "EV-Forums.nl (Netherlands/Benelux)",
      "Endless Sphere (global)"
    ],
    "stats": {
      "total_processed": 2500,
      "accepted": 280,
      "rejected": 2220,
      "acceptance_rate": "11.2%"
    }
  },
  "data": [
    {
      "question": "How do I charge my LiFePO4 battery?",
      "answer": "Use a dedicated LiFePO4 charger with...",
      "source": "Photovoltaikforum",
      "confidence": 0.92,
      "chemistry": "LiFePO4",
      "language": "de",
      "region": "Germany"
    }
  ]
}
```

---

## Setup & Deployment

### 1. Install Dependencies
```bash
npm install
```

Requires: `cheerio` (web parsing), `node-fetch` (HTTP), `dotenv` (env vars)

### 2. Configure Credentials (Optional)

**For Reddit mining:**
```bash
export REDDIT_CLIENT_ID=your_client_id
export REDDIT_CLIENT_SECRET=your_client_secret
export REDDIT_USER_AGENT="MyBot/1.0"
```

Create a Reddit app at: https://www.reddit.com/prefs/apps

**For GitHub (future):**
```bash
export GITHUB_TOKEN=your_github_token
```

### 3. Run Mining

**Full global pipeline:**
```bash
node scripts/mine-global-forums-v3.js
```

**Reddit only:**
```bash
node scripts/scraper-reddit.js
```

**Web forums only:**
```bash
node scripts/scraper-forums-web.js
```

**Test chemistry detection:**
```bash
npm test
```

### 4. Validate Output

```bash
npm run validate
```

Checks:
- Valid JSON structure
- Chemistry filtering compliance (all records are LiFePO4)
- Confidence scores reasonable
- Required fields present

---

## Regional Coverage

| Region | Primary Source | Language | Status |
|--------|---|---|---|
| **Global** | Reddit | EN | ✅ Active |
| **USA/Americas** | DIY Solar Forum | EN | ✅ Active |
| **Germany/Austria/Switzerland** | Photovoltaikforum | DE | ✅ Active |
| **Netherlands/Benelux** | EV-Forums.nl | NL | ✅ Active |
| **Worldwide (EV)** | Endless Sphere | EN | ✅ Active |
| **France/Belgium** | Futura-Sciences | FR | 🟡 Planned |
| **Italy** | Forum Energia Solare | IT | 🟡 Planned |
| **Spain/LATAM** | Foro Energia Solar | ES | 🟡 Planned |
| **Australia** | Australian Solar Forum | EN | 🟡 Planned |
| **China** | Chinese forums (aggregated) | ZH | 🔴 Complex |

---

## Performance Expectations

### Estimated Output per Cycle (24 hours)

| Source | Content Processed | LiFePO4 Accepted | Q&A Pairs |
|--------|---|---|---|
| Reddit (8 subreddits) | 400–600 posts | 60–80 | 80–120 |
| DIY Solar Forum | 150–200 posts | 30–40 | 40–60 |
| Photovoltaikforum | 200–300 posts | 40–50 | 50–80 |
| EV-Forums.nl | 80–120 posts | 15–25 | 20–40 |
| Endless Sphere | 120–180 posts | 20–30 | 30–50 |
| **TOTAL** | **950–1,400** | **165–225** | **220–350** |

**Overall acceptance rate:** 15–20% (higher than Phase 2A due to forum-specific targeting)

---

## Adding New Sources

### Add to Registry

**Edit `data/forums-registry.js`:**

```javascript
newForum: {
  name: 'Forum Name',
  url: 'https://example.com',
  type: 'phpBB | api | custom',
  language: 'en',
  regions: ['Country'],
  selectors: {
    post: 'div.post',
    title: 'h3',
    content: 'div.content',
    author: 'span.author'
  },
  rateLimit: '10 req/min'
}
```

### Create Scraper

**Extend `ForumWebScraper` for web-based forums:**

```javascript
class NewForumScraper extends ForumWebScraper {
  constructor() {
    super({
      baseUrl: 'https://example.com',
      rateLimit: 2000,
      selectors: { /* ... */ },
      lang: 'en'
    });
  }
}
```

**Or implement custom scraper for API-based forums:**

```javascript
class NewAPIScraper {
  async fetchContent(keyword) { /* ... */ }
  async mineSource() { /* ... */ }
}
```

### Register in Orchestrator

**Edit `scripts/mine-global-forums-v3.js`:**

```javascript
setupWebScrapers() {
  this.webScrapers = {
    // ... existing
    newForum: new NewForumScraper()
  };
}

async mineWebForums() {
  // Add to loop:
  for (const [key, scraper] of Object.entries(this.webScrapers)) {
    // ... existing logic
  }
}
```

---

## Deployment to Production

### GitHub Actions (Nightly)

**File:** `.github/workflows/nightly-forum-mining.yml`

**Trigger:** Daily at 2 AM UTC

**Steps:**
1. Install dependencies
2. Run `mine-global-forums-v3.js`
3. Validate output
4. Commit results to repo
5. Upload to R2 bucket (future)

### Cloudflare Workers (API Endpoint)

**Planned:** Week 2

- Serves `/api/qa?region=de` (filter by region)
- Serves `/api/search?q=charging` (semantic search)
- Caches JSON in R2 for fast delivery

---

## Monitoring & Alerts

### Daily Metrics to Track

```bash
# Check latest run
tail -f /mnt/user-data/outputs/lifepo4-global-qa-*.json | jq '.metadata.stats'

# Expected:
# - total_processed: 1000–1500
# - accepted: 200–300
# - acceptance_rate: 15–20%
# - No errors in Reddit/web scraping
```

### Alert Thresholds

- ❌ **Acceptance rate < 10%** — Chemistry filter too strict
- ❌ **Acceptance rate > 25%** — Chemistry filter too loose
- ❌ **No results from Reddit** — API authentication failed
- ❌ **No results from web forums** — Selectors outdated (forum redesigned)

---

## Next Steps (Roadmap)

| Phase | Target | Status |
|---|---|---|
| **2B.1** | Complete + test main 5 sources | ← YOU ARE HERE |
| **2B.2** | Deploy GitHub Actions nightly | This week |
| **2B.3** | Add 5 more sources (France, Italy, Spain) | Week 2 |
| **2B.4** | Deploy Cloudflare Workers API | Week 2 |
| **2B.5** | Add China forums (CATL/BYD) | Week 3 |
| **3.0** | Integrate with SOLARIS FAQ UI | Week 3 |

---

## Key Files

```
lifepo4-sources/
├── data/
│   └── forums-registry.js                ← 50+ sources metadata
├── scripts/
│   ├── mine-forums-global-v2-FILTERED.js ← Chemistry detection
│   ├── scraper-reddit.js                 ← Reddit API
│   ├── scraper-forums-web.js             ← Web scraper framework
│   ├── mine-global-forums-v3.js          ← Orchestrator
│   ├── validate-qa-output.js             ← Validation
│   └── test-chemistry-detection.js       ← Tests
└── .github/workflows/
    └── nightly-forum-mining.yml          ← GitHub Actions
```

---

**Phase 2B Status:** ✅ Architecture complete + proof of concept ready

**Next action:** Test with Reddit + DIY Solar Forum, then activate GitHub Actions nightly.

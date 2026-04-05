#!/usr/bin/env node
/**
 * mine-forums-global-v2-FILTERED.js (UPDATED)
 * 
 * Orchestrates global forum mining with real scrapers
 * 
 * Phase 1 (PoC): Reddit + Camperforum.nl
 * Phase 2 (Scale): +German forums, Trustpilot, GitHub, etc.
 * 
 * Chemistry filtering: LiFePO4 ONLY
 */

const fs = require('fs');
const path = require('path');
const RedditScraper = require('./reddit-scraper');
const CamperforumScraper = require('./camperforum-scraper');

// Chemistry detection (reused from v1)
const LIFEPO4_KEYWORDS = [
  'lifepo4', 'lfp', 'lithium iron phosphate',
  'lifep04', 'lifepo', 'ife', 'lfpo4'
];

const EXCLUDED_CHEMISTRIES = {
  leadAcid: ['lead-acid', 'lead acid', 'sla', 'agm', 'flooded', 'pb-acid'],
  lipo: ['lipo', 'li-po', 'li po', 'polymer', 'pouch cell'],
  nmc: ['nmc', 'n-m-c', 'nca', 'nickel manganese cobalt', 'nickel-cobalt'],
  other: ['solid state', 'sodium ion', 'sodium-ion', 'sib', 'zinc carbon']
};

class ChemistryDetector {
  constructor() {
    this.confidenceThreshold = 0.6;
  }

  detect(text) {
    if (!text || text.length === 0) {
      return { chemistry: 'unknown', confidence: 0, isLiFePO4: false };
    }

    const lowerText = text.toLowerCase();

    // Step 1: Check for LiFePO4 markers FIRST
    const lifepo4Score = this.scoreMatches(lowerText, LIFEPO4_KEYWORDS);
    
    if (lifepo4Score > 0.5) {
      return {
        chemistry: 'LiFePO4',
        confidence: Math.min(lifepo4Score, 1.0),
        isLiFePO4: true
      };
    }

    // Step 2: Check for excluded chemistries
    const excludedScore = this.checkExcluded(lowerText);
    if (excludedScore.detected) {
      return {
        chemistry: excludedScore.type,
        confidence: excludedScore.confidence,
        isLiFePO4: false,
        reason: `Excluded chemistry: ${excludedScore.type}`
      };
    }

    // Step 3: Generic lithium without chemistry spec
    if (lowerText.includes('lithium') || lowerText.includes('li-ion')) {
      return {
        chemistry: 'generic-lithium',
        confidence: 0.7,
        isLiFePO4: false,
        reason: 'Generic lithium without LiFePO4 confirmation'
      };
    }

    return { chemistry: 'unknown', confidence: 0, isLiFePO4: false };
  }

  scoreMatches(text, keywords) {
    let score = 0;
    keywords.forEach(kw => {
      const count = (text.split(kw).length - 1);
      if (count > 0) {
        score += Math.min(count, 3) * 0.4;
      }
    });
    return Math.min(score, 1.0);
  }

  checkExcluded(text) {
    for (const [type, keywords] of Object.entries(EXCLUDED_CHEMISTRIES)) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          return { detected: true, type, confidence: 0.8 };
        }
      }
    }
    return { detected: false, type: null, confidence: 0 };
  }
}

// Main mining orchestrator
class GlobalForumMiner {
  constructor() {
    this.detector = new ChemistryDetector();
    this.allResults = [];
    this.stats = {
      reddit: { fetched: 0, extracted: 0, accepted: 0, rejected: 0 },
      camperforum: { fetched: 0, extracted: 0, accepted: 0, rejected: 0 },
      total: { processed: 0, accepted: 0, rejected: 0, errors: 0 }
    };
  }

  /**
   * Mine Reddit (requires environment variables)
   */
  async mineReddit() {
    console.log('\n' + '='.repeat(60));
    console.log('🔴 REDDIT MINING (PoC)');
    console.log('='.repeat(60));

    // Check for Reddit API credentials
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const refreshToken = process.env.REDDIT_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      console.log('⚠️  Skipping Reddit: Missing REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, or REDDIT_REFRESH_TOKEN');
      console.log('   To enable: export REDDIT_CLIENT_ID=... (and others)');
      return;
    }

    try {
      const scraper = new RedditScraper(
        clientId,
        clientSecret,
        refreshToken,
        'LiFePO4-Bot/1.0 (by /u/evertlodder)'
      );

      const redditResults = await scraper.scrapeAll();
      const stats = scraper.getStats();

      console.log(`\n📊 Reddit Stats:`);
      console.log(`  Posts fetched: ${stats.posts_fetched}`);
      console.log(`  Q&A pairs extracted: ${stats.qa_pairs}`);
      console.log(`  Average score: ${stats.average_score}`);

      // Filter by chemistry
      for (const result of redditResults) {
        const chemistry = this.detector.detect(`${result.question} ${result.answer}`);
        
        if (chemistry.isLiFePO4) {
          result.chemistry = 'LiFePO4';
          result.chemistry_confidence = chemistry.confidence;
          this.allResults.push(result);
          this.stats.reddit.accepted++;
        } else {
          this.stats.reddit.rejected++;
        }
      }

      this.stats.reddit.extracted = stats.qa_pairs;
      console.log(`  ✅ Accepted (LiFePO4): ${this.stats.reddit.accepted}`);
      console.log(`  🚫 Rejected (other chemistry): ${this.stats.reddit.rejected}`);

    } catch (err) {
      console.error(`❌ Reddit scraper error: ${err.message}`);
      this.stats.total.errors++;
    }
  }

  /**
   * Mine Camperforum.nl
   */
  async mineCamperforum() {
    console.log('\n' + '='.repeat(60));
    console.log('🇳🇱 CAMPERFORUM.NL MINING (PoC)');
    console.log('='.repeat(60));

    try {
      const scraper = new CamperforumScraper();
      const camperResults = await scraper.scrapeAll();
      const stats = scraper.getStats();

      console.log(`\n📊 Camperforum Stats:`);
      console.log(`  Threads fetched: ${stats.threads_fetched}`);
      console.log(`  Q&A pairs extracted: ${stats.qa_pairs}`);

      // Filter by chemistry
      for (const result of camperResults) {
        const chemistry = this.detector.detect(`${result.question} ${result.answer}`);
        
        if (chemistry.isLiFePO4) {
          result.chemistry = 'LiFePO4';
          result.chemistry_confidence = chemistry.confidence;
          this.allResults.push(result);
          this.stats.camperforum.accepted++;
        } else {
          this.stats.camperforum.rejected++;
        }
      }

      this.stats.camperforum.extracted = stats.qa_pairs;
      console.log(`  ✅ Accepted (LiFePO4): ${this.stats.camperforum.accepted}`);
      console.log(`  🚫 Rejected (other chemistry): ${this.stats.camperforum.rejected}`);

    } catch (err) {
      console.error(`❌ Camperforum scraper error: ${err.message}`);
      this.stats.total.errors++;
    }
  }

  /**
   * Deduplicate results
   */
  deduplicate() {
    const seen = new Set();
    const unique = [];

    for (const result of this.allResults) {
      // Simple dedup: combine Q+A and hash
      const key = `${result.question.slice(0, 50)}${result.answer.slice(0, 50)}`.toLowerCase();
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    console.log(`\n🔄 Deduplication:`);
    console.log(`  Before: ${this.allResults.length} pairs`);
    console.log(`  After: ${unique.length} unique pairs`);
    console.log(`  Duplicates removed: ${this.allResults.length - unique.length}`);

    return unique;
  }

  /**
   * Save results to JSON
   */
  saveResults(results) {
    const outputDir = '/mnt/user-data/outputs';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `lifepo4-qa-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    const output = {
      metadata: {
        generated_at: new Date().toISOString(),
        filter: 'LiFePO4 ONLY',
        version: '2.0-PoC',
        sources: ['Reddit', 'Camperforum.nl'],
        stats: {
          total_pairs: results.length,
          reddit: this.stats.reddit,
          camperforum: this.stats.camperforum,
          errors: this.stats.total.errors
        }
      },
      data: results
    };

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
      console.log(`\n✅ Results saved to ${filepath}`);
      console.log(`   Total size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
      return filepath;
    } catch (err) {
      console.error(`❌ Failed to save results:`, err.message);
      return null;
    }
  }

  /**
   * Main orchestration
   */
  async runAll() {
    console.log('\n🌍 LiFePO4 GLOBAL FORUM MINING — PHASE 1 (PoC)');
    console.log('Proof of Concept: Reddit + Camperforum.nl');
    console.log('Chemistry Filter: LiFePO4 ONLY\n');

    // Mine Reddit
    await this.mineReddit();

    // Mine Camperforum.nl
    await this.mineCamperforum();

    // Deduplicate
    const uniqueResults = this.deduplicate();

    // Save
    const filepath = this.saveResults(uniqueResults);

    // Final summary
    this.printSummary();

    return filepath;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📈 MINING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Q&A pairs: ${this.allResults.length}`);
    console.log(`\nBreakdown:`);
    console.log(`  Reddit:      ${this.stats.reddit.extracted} extracted → ${this.stats.reddit.accepted} LiFePO4`);
    console.log(`  Camperforum: ${this.stats.camperforum.extracted} extracted → ${this.stats.camperforum.accepted} LiFePO4`);
    console.log(`  Errors: ${this.stats.total.errors}`);
    console.log('\n✅ Phase 1 PoC complete. Ready to scale to more forums.\n');
  }
}

// Run if executed directly
if (require.main === module) {
  const miner = new GlobalForumMiner();
  miner.runAll().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { GlobalForumMiner, ChemistryDetector };

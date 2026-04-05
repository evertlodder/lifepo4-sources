#!/usr/bin/env node
/**
 * mine-global-forums-v3.js
 * 
 * Global forum mining orchestrator
 * Coordinates Reddit API, web scrapers, and the forum registry
 * Implements chemistry filtering and Q&A extraction
 * 
 * Phase 2B: Proof of concept with top 5 sources
 */

const fs = require('fs');
const path = require('path');

// Import modules
const { ChemistryDetector, QAExtractor, ForumMiner } = require('./mine-forums-global-v2-FILTERED.js');
const { FORUM_REGISTRY, getByPriority } = require('../data/forums-registry.js');
const { RedditScraper } = require('./scraper-reddit.js');
const {
  DIYSolarForumScraper,
  PhotovoltaikforumScraper,
  EVForumsNLScraper,
  EndlessSphereScraper
} = require('./scraper-forums-web.js');

class GlobalForumMiner extends ForumMiner {
  constructor(options = {}) {
    super();
    
    this.redditClient = null;
    this.webScrapers = {};
    this.miningStats = {
      redditPosts: 0,
      forumPosts: 0,
      githubDiscussions: 0,
      reviewPosts: 0,
      totalProcessed: 0,
      accepted: 0,
      rejected: 0
    };

    // Initialize Redis scraper if credentials provided
    if (options.redditClientId && options.redditClientSecret) {
      this.redditClient = new RedditScraper(
        options.redditClientId,
        options.redditClientSecret,
        options.redditUserAgent || 'LiFePO4-Miner/2.0'
      );
    }

    this.setupWebScrapers();
  }

  setupWebScrapers() {
    this.webScrapers = {
      diySolar: new DIYSolarForumScraper(),
      photovoltaikforum: new PhotovoltaikforumScraper(),
      evForumsNL: new EVForumsNLScraper(),
      endlessSphere: new EndlessSphereScraper()
    };
  }

  /**
   * Mine Reddit for LiFePO4 content
   */
  async mineReddit() {
    if (!this.redditClient) {
      console.log('\n⚠️  Reddit credentials not configured, skipping Reddit mining');
      return [];
    }

    console.log('\n🔴 Mining Reddit...');
    
    try {
      const subreddits = [
        'lifepo4batteries',
        'solar',
        'vandwellers',
        'OffGrid',
        'electricvehicles'
      ];

      const allPosts = await this.redditClient.mineSubreddits(subreddits);
      this.miningStats.redditPosts = allPosts.length;

      const results = [];
      for (const post of allPosts) {
        const chemistry = this.detector.detect(`${post.title} ${post.selftext}`);
        
        if (chemistry.isLiFePO4) {
          const pairs = this.extractor.extract(post.selftext, `Reddit r/${post.subreddit}`);
          results.push(...pairs);
          this.miningStats.accepted += pairs.length;
        } else {
          this.miningStats.rejected++;
        }
        this.miningStats.totalProcessed++;
      }

      console.log(`  ✅ Reddit: ${results.length} Q&A pairs extracted`);
      return results;
    } catch (err) {
      console.error(`  ❌ Reddit mining error: ${err.message}`);
      return [];
    }
  }

  /**
   * Mine web-based forums (phpBB, custom)
   */
  async mineWebForums() {
    console.log('\n🌐 Mining Web Forums...');
    
    const results = [];
    const keywords = ['lifepo4', 'lfp', 'lithium iron phosphate', 'battery storage'];

    for (const [key, scraper] of Object.entries(this.webScrapers)) {
      try {
        console.log(`\n  📖 ${key}...`);
        for (const keyword of keywords) {
          const posts = await scraper.mineForum(keyword, 3); // 3 pages max
          
          for (const post of posts) {
            const chemistry = this.detector.detect(`${post.title} ${post.content}`);
            
            if (chemistry.isLiFePO4) {
              const pairs = this.extractor.extract(post.content, post.source);
              results.push(...pairs);
              this.miningStats.accepted += pairs.length;
            } else {
              this.miningStats.rejected++;
            }
            this.miningStats.totalProcessed++;
          }
        }
      } catch (err) {
        console.error(`  ❌ ${key} error: ${err.message}`);
      }
    }

    console.log(`\n  ✅ Web Forums: ${results.length} Q&A pairs extracted`);
    return results;
  }

  /**
   * Mine GitHub discussions (DIY projects)
   */
  async mineGitHub() {
    console.log('\n👨‍💻 Mining GitHub Discussions...');
    
    // GitHub API implementation would go here
    // For now, this is a placeholder
    
    console.log('  ⚠️  GitHub mining not yet implemented');
    return [];
  }

  /**
   * Run complete global mining pipeline
   */
  async runGlobalMining() {
    console.log('🚀 Starting Global LiFePO4 Forum Mining (Phase 2B)');
    console.log('🌍 Worldwide coverage: Reddit + 4 EU forums + future sources');
    console.log(`Filter: LiFePO4 ONLY (excluding lead-acid, LiPo, NMC, NCA)\n`);

    const allResults = [];

    // Mine sources in priority order
    const redditResults = await this.mineReddit();
    allResults.push(...redditResults);

    const forumResults = await this.mineWebForums();
    allResults.push(...forumResults);

    const githubResults = await this.mineGitHub();
    allResults.push(...githubResults);

    // Print comprehensive stats
    this.printGlobalStats();
    
    // Save results
    this.saveGlobalResults(allResults);
    
    return allResults;
  }

  printGlobalStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Global Mining Summary:');
    console.log('='.repeat(60));
    
    console.log('\nContent mined:');
    console.log(`  Reddit posts: ${this.miningStats.redditPosts}`);
    console.log(`  Web forum posts: ${this.miningStats.forumPosts}`);
    console.log(`  GitHub discussions: ${this.miningStats.githubDiscussions}`);
    
    console.log('\nFiltering results:');
    console.log(`  Total processed: ${this.miningStats.totalProcessed}`);
    console.log(`  LiFePO4 accepted: ${this.miningStats.accepted}`);
    console.log(`  Other chemistry rejected: ${this.miningStats.rejected}`);
    console.log(`  Acceptance rate: ${((this.miningStats.accepted / this.miningStats.totalProcessed) * 100 || 0).toFixed(1)}%`);
    
    console.log('\nCoverage by region:');
    console.log('  ✅ Global (Reddit)');
    console.log('  ✅ Germany/Austria/Switzerland (Photovoltaikforum)');
    console.log('  ✅ Netherlands/Benelux (EV-Forums.nl)');
    console.log('  ✅ Worldwide (DIY Solar, Endless Sphere)');
    console.log('  ⚠️  France (future)');
    console.log('  ⚠️  Italy/Spain (future)');
    console.log('  ⚠️  Australia (future)');
    console.log('  ⚠️  China (future)');
    
    console.log('\n' + '='.repeat(60));
  }

  saveGlobalResults(results) {
    const outputDir = '/mnt/user-data/outputs';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `lifepo4-global-qa-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    const output = {
      metadata: {
        generated_at: new Date().toISOString(),
        mining_version: '3.0-global',
        filter: 'LiFePO4 ONLY',
        coverage: [
          'Reddit (global)',
          'DIY Solar Forum (US)',
          'Photovoltaikforum (Germany/Austria/Switzerland)',
          'EV-Forums.nl (Netherlands/Benelux)',
          'Endless Sphere (global)'
        ],
        stats: {
          total_processed: this.miningStats.totalProcessed,
          accepted: this.miningStats.accepted,
          rejected: this.miningStats.rejected,
          acceptance_rate: `${((this.miningStats.accepted / this.miningStats.totalProcessed) * 100 || 0).toFixed(1)}%`
        }
      },
      data: results
    };

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
      console.log(`\n✅ Global results saved: ${filename}`);
      console.log(`   Total Q&A pairs: ${results.length}`);
      console.log(`   File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
    } catch (err) {
      console.error(`❌ Failed to save results:`, err.message);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  // Load credentials from environment or config
  const miner = new GlobalForumMiner({
    redditClientId: process.env.REDDIT_CLIENT_ID,
    redditClientSecret: process.env.REDDIT_CLIENT_SECRET,
    redditUserAgent: process.env.REDDIT_USER_AGENT || 'LiFePO4-Miner/2.0'
  });

  miner.runGlobalMining().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { GlobalForumMiner };

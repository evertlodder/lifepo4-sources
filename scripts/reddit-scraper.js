/**
 * reddit-scraper.js
 * 
 * Scrapes LiFePO4 Q&A from Reddit using snoowrap API client
 * Subreddits: r/lifepo4batteries, r/solar, r/OffGrid, r/vandwellers, r/electricvehicles
 * 
 * Extracts:
 * - Post title → question
 * - Top upvoted comment(s) → answer
 * - Metadata: author, score, timestamp
 */

const snoowrap = require('snoowrap');

class RedditScraper {
  constructor(clientId, clientSecret, refreshToken, userAgent) {
    this.reddit = new snoowrap({
      userAgent,
      clientId,
      clientSecret,
      refreshToken
    });

    this.subreddits = [
      'lifepo4batteries',
      'solar',
      'OffGrid',
      'vandwellers',
      'electricvehicles'
    ];

    this.results = [];
    this.stats = {
      posts_fetched: 0,
      qa_pairs_extracted: 0,
      errors: 0
    };
  }

  /**
   * Fetch posts from a subreddit
   * Searches for LiFePO4-related posts from last 30 days
   */
  async fetchSubreddit(subredditName) {
    console.log(`\n📍 Fetching r/${subredditName}...`);

    try {
      const subreddit = this.reddit.getSubreddit(subredditName);

      // Search for LiFePO4 posts (last 30 days, sorted by new)
      const posts = await subreddit.search({
        query: 'lifepo4 OR lfp OR "lithium iron phosphate"',
        time: 'month',
        sort: 'new',
        limit: 50 // PoC: limit to 50 posts per subreddit
      });

      console.log(`  ✅ Found ${posts.length} posts`);
      this.stats.posts_fetched += posts.length;

      // Extract Q&A from each post
      for (const post of posts) {
        await this.extractQAFromPost(post, subredditName);
      }
    } catch (err) {
      console.error(`  ❌ Error fetching r/${subredditName}:`, err.message);
      this.stats.errors++;
    }
  }

  /**
   * Extract Q&A pair from a single Reddit post
   * Question = post title
   * Answer = top upvoted comment(s)
   */
  async extractQAFromPost(post, subredditName) {
    try {
      const question = this.cleanText(post.title);

      // Skip if too short
      if (question.length < 10) {
        return;
      }

      // Fetch comments
      await post.comments.expandReplies({ limit: 10, depth: 2 });
      
      // Get top-level comments, sorted by score
      const topComments = post.comments
        .filter(c => c.constructor.name === 'Comment' && c.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Top 3 comments as potential answers

      // Try to find best answer from comments
      for (const comment of topComments) {
        const answer = this.cleanText(comment.body);

        // Answer validation
        if (this.isValidAnswer(answer)) {
          this.results.push({
            question,
            answer,
            source: `Reddit (r/${subredditName})`,
            source_url: `https://reddit.com${post.permalink}`,
            author: comment.author?.name || '[deleted]',
            score: comment.score,
            timestamp: new Date(comment.created_utc * 1000).toISOString(),
            confidence: Math.min(0.85 + (Math.log(comment.score + 1) * 0.05), 1.0),
            extracted_at: new Date().toISOString()
          });

          this.stats.qa_pairs_extracted++;
          break; // One Q-A pair per post is enough
        }
      }
    } catch (err) {
      // Skip errors on individual posts
      console.log(`    ⚠️  Skipped post (comment fetch failed)`);
    }
  }

  /**
   * Validate answer quality
   */
  isValidAnswer(text) {
    return (
      text.length > 20 &&
      text.length < 2000 &&
      !text.includes('[deleted]') &&
      !text.includes('[removed]') &&
      // Must contain some technical content or experience sharing
      (text.includes('battery') || 
       text.includes('charge') || 
       text.includes('watt') ||
       text.includes('volt') ||
       text.includes('amp') ||
       text.includes('solar') ||
       text.includes('system') ||
       text.toLowerCase().includes('lfp') ||
       text.toLowerCase().includes('lifepo4'))
    );
  }

  /**
   * Clean Reddit text (remove markdown, normalize whitespace)
   */
  cleanText(text) {
    return text
      .replace(/\n+/g, ' ')
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1') // Remove markdown links
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);
  }

  /**
   * Run scraper for all subreddits
   */
  async scrapeAll() {
    console.log('🚀 Starting Reddit Scraper (PoC)');
    console.log(`   Subreddits: ${this.subreddits.join(', ')}\n`);

    for (const subreddit of this.subreddits) {
      await this.fetchSubreddit(subreddit);
      // Rate limiting: wait 2 seconds between subreddit requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return this.results;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      qa_pairs: this.results.length,
      average_score: this.results.length > 0
        ? Math.round(this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length)
        : 0
    };
  }
}

module.exports = RedditScraper;

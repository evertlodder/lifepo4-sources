/**
 * camperforum-scraper.js (FINAL — Forum Listing Approach)
 * 
 * Scrapes LiFePO4 Q&A from Camperforum.be by parsing forum listing pages
 * No search, no JavaScript, no authentication needed
 * 
 * Approach:
 * 1. Fetch camperforum.be/viewforum.php?f=10 (Elektronica forum)
 * 2. Parse thread titles from HTML with cheerio
 * 3. Paginate through results (&start=0, &start=25, etc.)
 * 4. Fetch each thread individually and extract Q&A
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

class CamperforumScraper {
  constructor() {
    this.baseUrl = 'https://camperforum.be';
    this.forumId = 10; // Elektronica forum
    this.results = [];
    this.stats = {
      forum_pages_fetched: 0,
      threads_visited: 0,
      qa_pairs_extracted: 0,
      errors: 0
    };
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 LiFePO4-Bot/1.0';
  }

  /**
   * Fetch and parse forum listing page
   */
  async fetchForumListingPage(startIndex) {
    const forumUrl = `${this.baseUrl}/viewforum.php?f=${this.forumId}&start=${startIndex}`;

    try {
      const response = await fetch(forumUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Parse thread links from forum listing
      // phpBB structure: threads are in <a href="viewtopic.php?..."> links
      const threadLinks = $('a[href*="viewtopic.php"]');
      
      const threads = [];
      for (const link of threadLinks) {
        const $link = $(link);
        const href = $link.attr('href');
        const title = $link.text().trim();

        // Filter out navigation/button links
        if (href && href.includes('viewtopic.php') && title.length > 5) {
          // Get full URL if relative
          const threadUrl = href.startsWith('http') 
            ? href 
            : `${this.baseUrl}/${href}`;

          threads.push({ url: threadUrl, title });
        }
      }

      this.stats.forum_pages_fetched++;
      console.log(`  📄 Page (start=${startIndex}): Found ${threads.length} threads`);

      return threads;

    } catch (err) {
      console.error(`  ❌ Error fetching forum page: ${err.message}`);
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Fetch individual thread and extract Q&A
   */
  async fetchThread(threadUrl, threadTitle) {
    try {
      const response = await fetch(threadUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract question (thread title)
      const question = this.cleanText(threadTitle);

      if (question.length < 10) {
        return;
      }

      // Extract first post (answer)
      // phpBB: posts are in <div class="postbody"> or similar
      const postContent = $('div.postbody, div.post-content, article').first();

      if (postContent.length === 0) {
        return;
      }

      let answerText = postContent.text();
      answerText = answerText
        .replace(/^Quote.*?$/gm, '')
        .replace(/\[quote\].*?\[\/quote\]/gis, '')
        .trim();

      const answer = this.cleanText(answerText);

      if (!this.isValidAnswer(answer)) {
        return;
      }

      // Extract author
      const authorElem = $('strong.username, .post-author, dt').first();
      const author = authorElem.text().trim() || 'Anonymous';

      // Extract timestamp
      const dateElem = $('time, .post-date, .datetime').first();
      const timestamp = dateElem.attr('datetime') || new Date().toISOString();

      this.results.push({
        question,
        answer,
        source: 'Camperforum.be',
        source_url: threadUrl,
        author,
        timestamp,
        confidence: 0.85,
        extracted_at: new Date().toISOString()
      });

      this.stats.qa_pairs_extracted++;
      console.log(`    ✅ Q&A: "${question.substring(0, 50)}..."`);

    } catch (err) {
      console.log(`    ⚠️  Thread skipped: ${err.message}`);
    }
  }

  /**
   * Validate answer quality
   */
  isValidAnswer(text) {
    return (
      text.length > 30 &&
      text.length < 3000 &&
      !text.includes('[deleted]') &&
      (text.toLowerCase().includes('battery') ||
       text.toLowerCase().includes('lifepo4') ||
       text.toLowerCase().includes('lfp') ||
       text.toLowerCase().includes('charge') ||
       text.toLowerCase().includes('solar') ||
       text.toLowerCase().includes('watt') ||
       text.toLowerCase().includes('volt') ||
       text.toLowerCase().includes('camper') ||
       text.toLowerCase().includes('system'))
    );
  }

  /**
   * Clean text (remove HTML, normalize whitespace)
   */
  cleanText(text) {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\[.*?\]/g, '') // Remove BBCode
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);
  }

  /**
   * Run scraper — fetch forum listing pages and extract Q&A
   */
  async scrapeAll(maxPages = 3) {
    console.log('🚀 Starting Camperforum.be Scraper (Forum Listing Approach)');
    console.log(`   Forum: Elektronica (f=${this.forumId})`);
    console.log(`   Pages: ${maxPages}\n`);

    for (let page = 0; page < maxPages; page++) {
      const startIndex = page * 25; // Camperforum uses 25 results per page

      console.log(`\n📍 Fetching forum page ${page + 1} (start=${startIndex})`);

      // Fetch forum listing page
      const threads = await this.fetchForumListingPage(startIndex);

      if (threads.length === 0) {
        console.log(`   No more threads found. Stopping.`);
        break;
      }

      // Extract Q&A from each thread
      for (const thread of threads) {
        await this.fetchThread(thread.url, thread.title);
        this.stats.threads_visited++;
        // Rate limiting: 300ms between threads
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Rate limiting: 1s between forum pages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return this.results;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      qa_pairs: this.results.length
    };
  }
}

module.exports = CamperforumScraper;

// Run scraper if this is the main module
if (require.main === module) {
  (async () => {
    const scraper = new CamperforumScraper();
    const results = await scraper.scrapeAll(2); // Fetch first 2 pages

    console.log('\n' + '='.repeat(60));
    console.log('✅ SCRAPING COMPLETE');
    console.log('='.repeat(60));
    console.log('\nStatistics:');
    console.log(JSON.stringify(scraper.getStats(), null, 2));

    if (results.length > 0) {
      console.log('\n📊 Sample Q&A Pairs:');
      results.slice(0, 3).forEach((qa, i) => {
        console.log(`\n[${i + 1}] Q: ${qa.question.substring(0, 60)}...`);
        console.log(`    A: ${qa.answer.substring(0, 60)}...`);
        console.log(`    Author: ${qa.author}`);
      });
    }
  })().catch(err => {
    console.error('❌ Fatal error:', err.message);
    process.exit(1);
  });
}
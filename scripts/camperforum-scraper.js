/**
 * camperforum-scraper.js (v3 — CORRECT DOMAIN)
 * 
 * Scrapes LiFePO4 Q&A from Camperforum.be (phpBB forum)
 * DOMAIN FIX: camperforum.be (not .nl)
 * Base URL: https://camperforum.be (no www, no /forum path)
 * Search endpoint: /search.php
 */

const fetch = require('node-fetch');
const cheerio = require('cheerio');

class CamperforumScraper {
  constructor() {
    // CORRECTED: camperforum.be (not .nl)
    this.baseUrl = 'https://camperforum.be';
    this.searchPath = '/search.php';
    this.results = [];
    this.stats = {
      threads_fetched: 0,
      qa_pairs_extracted: 0,
      errors: 0
    };
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 LiFePO4-Bot/1.0';
  }

  /**
   * Search for LiFePO4 threads using POST to /search.php
   */
  async search(query, pages = 3) {
    console.log(`\n📍 Searching Camperforum.be for: "${query}"`);
    console.log(`   Pages: ${pages}`);

    for (let page = 1; page <= pages; page++) {
      try {
        await this.fetchSearchPage(query, page);
        // Rate limiting: 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`  ❌ Error fetching page ${page}:`, err.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Fetch single search results page via POST
   */
  async fetchSearchPage(query, pageNum) {
    // Build form data for POST to search.php
    const formData = new URLSearchParams();
    formData.append('keywords', query);
    formData.append('fid', '10'); // 10 = Elektronica (electronics) forum
    formData.append('sc', '1'); // search topics
    formData.append('st', 'p'); // Plaatsingstijd (date) sort
    formData.append('sf', 'd'); // sort descending
    formData.append('sr', 'all'); // all posts
    formData.append('start', (pageNum - 1) * 25); // Assuming 25 results per page

    const searchUrl = `${this.baseUrl}${this.searchPath}`;

    try {
      const response = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Parse search results (phpBB structure)
      const threadRows = $('a[href*="viewtopic.php"]');

      console.log(`  Page ${pageNum}: Found ${threadRows.length} results`);

      if (threadRows.length === 0) {
        console.log(`  ⚠️  No results found`);
        return;
      }

      for (const link of threadRows) {
        let threadUrl = $(link).attr('href');
        const threadTitle = $(link).text().trim();

        if (threadUrl && threadTitle.length > 5) {
          // FIX: Ensure URL is absolute — remove leading dot if present
          if (!threadUrl.startsWith('http')) {
            // Make sure no double slashes or extra dots
            threadUrl = threadUrl.replace(/^\.+/, ''); // Remove leading dots
            threadUrl = threadUrl.replace(/^\/+/, '/'); // Normalize leading slashes
            threadUrl = `${this.baseUrl}${threadUrl}`;
          }

          // Extract Q&A from thread
          await this.fetchThread(threadUrl, threadTitle);

          // Rate limiting: 500ms between thread requests
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

    } catch (err) {
      console.error(`  ❌ Search request failed: ${err.message}`);
      this.stats.errors++;
    }
  }

  /**
   * Fetch single thread and extract Q&A
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

      // Extract answer from first post
      const firstPost = $('div.postbody, div.post-content, div.post, article').first();

      if (firstPost.length === 0) {
        return;
      }

      let answerText = firstPost.text();

      // Remove quotes if this is a response
      answerText = answerText
        .replace(/^Quote.*?$/gm, '')
        .trim();

      const answer = this.cleanText(answerText);

      if (!this.isValidAnswer(answer)) {
        return;
      }

      // Extract metadata
      const authorElem = $('strong.username, .post-author, .author').first();
      const author = authorElem.text().trim() || 'Anonymous';

      const dateElem = $('time, .post-date, .datetime').first();
      const timestamp = dateElem.attr('datetime') || new Date().toISOString();

      this.results.push({
        question,
        answer,
        source: 'Camperforum.be',
        source_url: threadUrl,
        author,
        timestamp,
        confidence: 0.80,
        extracted_at: new Date().toISOString()
      });

      this.stats.qa_pairs_extracted++;
      console.log(`    ✅ Extracted: "${question.substring(0, 40)}..."`);

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
      !text.includes('Quote') &&
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
   * Clean HTML text
   */
  cleanText(text) {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1500);
  }

  /**
   * Run scraper
   */
  async scrapeAll() {
    console.log('🚀 Starting Camperforum.be Scraper (v3 — Domain Fixed)');
    console.log('   Pattern: phpBB forums (scales to German, Italian, etc.)\n');

    const queries = [
      'lifepo4',
      'lfp batterij',
      'lithium iron phosphate',
      'lifepo4 camper',
      'solar lifepo4'
    ];

    for (const query of queries) {
      await this.search(query, 2);
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
      qa_pairs: this.results.length
    };
  }
}

module.exports = CamperforumScraper;
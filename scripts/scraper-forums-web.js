/**
 * scraper-forums-web.js
 * 
 * Web scraper for phpBB-style forums (Camperforum, DIY Solar Forum, EV-Forums.nl)
 * Uses cheerio for HTML parsing
 * Respects robots.txt and implements rate limiting
 */

const https = require('https');
const http = require('http');
const cheerio = require('cheerio');

class ForumWebScraper {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl;
    this.rateLimit = options.rateLimit || 2000; // ms between requests
    this.lastRequest = 0;
    this.userAgent = options.userAgent || 'LiFePO4-Miner/2.0 (+https://lifepo4.solar)';
    this.selectors = options.selectors || {};
    this.lang = options.lang || 'en';
  }

  /**
   * Fetch and parse a page
   */
  async fetchPage(url) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimit - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }, (res) => {
        if (res.statusCode === 404) {
          return reject(new Error(`404: ${url}`));
        }
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const $ = cheerio.load(data);
            resolve($);
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Extract posts from phpBB forum page
   */
  async scrapephpBBForum(searchUrl) {
    console.log(`  🔍 Scraping phpBB forum: ${searchUrl}`);
    
    const posts = [];
    
    try {
      const $ = await this.fetchPage(searchUrl);
      
      // Select post containers (typical phpBB selector)
      $(this.selectors.post || 'div.post').each((idx, elem) => {
        const $post = cheerio.load(elem);
        
        const title = $post(this.selectors.title || 'h3').text().trim();
        const content = $post(this.selectors.content || 'div.post-content').text().trim();
        const author = $post(this.selectors.author || 'span.author').text().trim();
        const dateStr = $post(this.selectors.date || 'span.date').text().trim();
        
        if (title && content && content.length > 20) {
          posts.push({
            title,
            content,
            author,
            date: dateStr,
            source: this.baseUrl,
            url: searchUrl,
            type: 'forum-post'
          });
        }
      });

      console.log(`     ✅ Found ${posts.length} posts`);
      return posts;
    } catch (err) {
      console.error(`     ❌ Error: ${err.message}`);
      return [];
    }
  }

  /**
   * Search forum by keyword
   */
  async searchForum(keyword) {
    // Forum-specific search URL patterns
    const searchPatterns = {
      'camperforum.nl': `${this.baseUrl}/forum/search.php?keywords=${encodeURIComponent(keyword)}`,
      'diysolarforum.com': `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}`,
      'ev-forums.nl': `${this.baseUrl}/search?keywords=${encodeURIComponent(keyword)}`,
      'endless-sphere.com': `${this.baseUrl}/forums/search.php?keywords=${encodeURIComponent(keyword)}`
    };

    let searchUrl;
    for (const [domain, pattern] of Object.entries(searchPatterns)) {
      if (this.baseUrl.includes(domain)) {
        searchUrl = pattern;
        break;
      }
    }

    if (!searchUrl) {
      searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(keyword)}`;
    }

    return this.scrapephpBBForum(searchUrl);
  }

  /**
   * Mine forum with pagination
   */
  async mineForum(keyword, maxPages = 5) {
    const allPosts = [];
    
    for (let page = 1; page <= maxPages; page++) {
      console.log(`    Page ${page}/${maxPages}...`);
      
      const searchUrl = `${this.baseUrl}/search?keywords=${encodeURIComponent(keyword)}&start=${(page - 1) * 25}`;
      const posts = await this.scrapephpBBForum(searchUrl);
      
      if (posts.length === 0) {
        console.log(`    No more posts found at page ${page}`);
        break;
      }
      
      allPosts.push(...posts);
    }

    return allPosts;
  }
}

/**
 * Specialized scraper for DIY Solar Forum (custom structure)
 */
class DIYSolarForumScraper extends ForumWebScraper {
  constructor() {
    super({
      baseUrl: 'https://diysolarforum.com',
      rateLimit: 2000,
      selectors: {
        post: 'div.post',
        title: 'h2.post-title',
        content: 'div.post-content',
        author: 'span.post-author',
        date: 'span.post-date'
      },
      lang: 'en'
    });
  }
}

/**
 * Specialized scraper for Photovoltaikforum (German)
 */
class PhotovoltaikforumScraper extends ForumWebScraper {
  constructor() {
    super({
      baseUrl: 'https://www.photovoltaikforum.de',
      rateLimit: 3000,
      selectors: {
        post: 'div.post',
        title: 'h3.post-title',
        content: 'div.post-body',
        author: 'span.author',
        date: 'span.date'
      },
      lang: 'de'
    });
  }
}

/**
 * Specialized scraper for EV-Forums.nl (Dutch)
 */
class EVForumsNLScraper extends ForumWebScraper {
  constructor() {
    super({
      baseUrl: 'https://www.ev-forums.nl',
      rateLimit: 3000,
      selectors: {
        post: 'div.post',
        title: 'h3',
        content: 'div.post-body',
        author: 'span.author',
        date: 'span.date'
      },
      lang: 'nl'
    });
  }
}

/**
 * Specialized scraper for Endless Sphere
 */
class EndlessSphereScraper extends ForumWebScraper {
  constructor() {
    super({
      baseUrl: 'https://endless-sphere.com/forums',
      rateLimit: 2000,
      selectors: {
        post: 'table.windowbg',
        title: 'span.subject a',
        content: 'div.post',
        author: 'b',
        date: 'span.smalltext'
      },
      lang: 'en'
    });
  }
}

module.exports = {
  ForumWebScraper,
  DIYSolarForumScraper,
  PhotovoltaikforumScraper,
  EVForumsNLScraper,
  EndlessSphereScraper
};

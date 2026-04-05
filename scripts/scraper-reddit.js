/**
 * scraper-reddit.js
 * 
 * Reddit scraper using PRAW (Python Reddit API Wrapper)
 * Alternative: Use node-reddit-api or manual fetch
 * 
 * This is a Node.js implementation using API calls
 */

const https = require('https');

class RedditScraper {
  constructor(clientId, clientSecret, userAgent) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.userAgent = userAgent;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth2 access token
   */
  async authenticate() {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const options = {
        hostname: 'www.reddit.com',
        port: 443,
        path: '/api/v1/access_token',
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            this.accessToken = json.access_token;
            this.tokenExpiry = Date.now() + (json.expires_in * 1000);
            resolve();
          } catch (err) {
            reject(new Error(`Auth failed: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write('grant_type=client_credentials');
      req.end();
    });
  }

  /**
   * Fetch posts from subreddit
   */
  async fetchSubreddit(subreddit, limit = 100) {
    if (!this.accessToken || Date.now() > this.tokenExpiry) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'oauth.reddit.com',
        port: 443,
        path: `/r/${subreddit}/search?q=lifepo4&sort=new&limit=${limit}&type=posts`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.userAgent
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const posts = json.data.children.map(item => ({
              id: item.data.id,
              title: item.data.title,
              selftext: item.data.selftext,
              author: item.data.author,
              created_utc: item.data.created_utc,
              score: item.data.score,
              url: `https://reddit.com${item.data.permalink}`,
              subreddit: item.data.subreddit
            }));
            resolve(posts);
          } catch (err) {
            reject(new Error(`Parse failed: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Fetch comments from post
   */
  async fetchPostComments(subreddit, postId, limit = 50) {
    if (!this.accessToken || Date.now() > this.tokenExpiry) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'oauth.reddit.com',
        port: 443,
        path: `/r/${subreddit}/comments/${postId}?sort=best&limit=${limit}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.userAgent
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const comments = [];
            
            // Recursively flatten comment tree
            const flatten = (children) => {
              if (!children || !children.data) return;
              children.data.children.forEach(child => {
                if (child.kind === 't1') {
                  comments.push({
                    author: child.data.author,
                    body: child.data.body,
                    score: child.data.score,
                    created_utc: child.data.created_utc
                  });
                }
                if (child.data.replies) {
                  flatten(child.data.replies);
                }
              });
            };

            flatten(json[1]);
            resolve(comments);
          } catch (err) {
            reject(new Error(`Comment parse failed: ${err.message}`));
          }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Mine multiple subreddits
   */
  async mineSubreddits(subreddits) {
    const results = [];

    for (const sub of subreddits) {
      console.log(`  📖 Mining r/${sub}...`);
      try {
        const posts = await this.fetchSubreddit(sub, 100);
        console.log(`     Found ${posts.length} posts`);
        results.push(...posts);
      } catch (err) {
        console.error(`     ❌ Error: ${err.message}`);
      }
    }

    return results;
  }
}

module.exports = { RedditScraper };

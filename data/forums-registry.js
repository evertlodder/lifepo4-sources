/**
 * forums-registry.js
 * 
 * Global forum registry for LiFePO4 mining
 * Metadata: URL, type, language, scraping method, CSS selectors
 * 
 * Status: Phase 2B — Proof of concept scrapers for top 3-5 sources
 */

const FORUM_REGISTRY = {
  // ============ ENGLISH-SPEAKING (HIGHEST PRIORITY) ============
  
  reddit: {
    name: 'Reddit',
    type: 'social',
    language: 'en',
    regions: ['global'],
    subreddits: [
      { sub: 'lifepo4batteries', weight: 1.0 },
      { sub: 'solar', weight: 0.7 },
      { sub: 'vandwellers', weight: 0.6 },
      { sub: 'OffGrid', weight: 0.7 },
      { sub: 'electricvehicles', weight: 0.5 },
      { sub: 'Batteries', weight: 0.5 },
      { sub: 'PowerBI', weight: 0.4 },
      { sub: 'RVLiving', weight: 0.6 }
    ],
    api: 'PRAW (Reddit API)',
    authentication: 'OAuth2',
    rateLimit: '60 req/min',
    selectors: {
      post: 'div[data-testid="post-container"]',
      title: 'h3',
      content: '[data-testid="post-content"]',
      comments: 'div[data-testid="comment"]'
    },
    notes: 'Highest engagement, multi-subreddit approach needed'
  },

  diySolarForum: {
    name: 'DIY Solar Forum',
    url: 'https://diysolarforum.com',
    type: 'phpBB',
    language: 'en',
    regions: ['US', 'global'],
    categories: ['batteries', 'lifepo4', 'off-grid'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    selectors: {
      post: 'div.post',
      title: 'h2.post-title',
      content: 'div.post-content',
      author: 'span.post-author'
    },
    notes: 'Active community, slow updates OK'
  },

  endlessSphere: {
    name: 'Endless Sphere Forum',
    url: 'https://endless-sphere.com/forums',
    type: 'custom',
    language: 'en',
    regions: ['global'],
    sections: ['batteries', 'electric-vehicles', 'ebikes'],
    api: 'none',
    scraping: 'web',
    rateLimit: '5 req/min',
    selectors: {
      post: 'table.windowbg',
      title: 'span.subject',
      content: 'div.post',
      date: 'span.smalltext'
    },
    notes: 'Niche EV/battery expertise'
  },

  evForumsNL: {
    name: 'EV-Forums.nl',
    url: 'https://www.ev-forums.nl',
    type: 'phpBB',
    language: 'nl',
    regions: ['Netherlands', 'Benelux'],
    categories: ['battery', 'storage', 'solar'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    selectors: {
      post: 'div.post',
      title: 'h3',
      content: 'div.post-body'
    },
    notes: 'Dutch expertise, Benelux focus'
  },

  iRV2: {
    name: 'iRV2 RV Forum',
    url: 'https://www.irv2.com/forums',
    type: 'custom',
    language: 'en',
    regions: ['North America'],
    categories: ['power-systems', 'batteries', 'solar'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    selectors: {
      post: 'div.post-item',
      title: 'h4.post-title',
      content: 'div.post-content'
    },
    notes: 'Large RV/camper community, LiFePO4 adoption high'
  },

  // ============ GERMAN-SPEAKING (MAJOR MARKET) ============

  photovoltaikforum: {
    name: 'Photovoltaikforum.de',
    url: 'https://www.photovoltaikforum.de',
    type: 'custom',
    language: 'de',
    regions: ['Germany', 'Austria', 'Switzerland'],
    categories: ['speicher', 'batterie', 'lifepo4'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    selectors: {
      post: 'div.post',
      title: 'h3.post-title',
      content: 'div.post-body',
      author: 'span.author'
    },
    notes: 'Largest German solar community, strong LiFePO4 adoption'
  },

  elektrofahrzeugforum: {
    name: 'Elektrofahrzeugforum.de',
    url: 'https://www.elektrofahrzeugforum.de',
    type: 'custom',
    language: 'de',
    regions: ['Germany', 'Austria'],
    categories: ['batterie', 'speicher', 'powertrain'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    selectors: {
      post: 'div[class*="post"]',
      title: 'h3',
      content: 'div[class*="post-content"]'
    },
    notes: 'EV-focused, growing battery storage discussion'
  },

  // ============ FRENCH-SPEAKING ============

  futurasciences: {
    name: 'Futura-Sciences Forums',
    url: 'https://forums.futura-sciences.com',
    type: 'custom',
    language: 'fr',
    regions: ['France', 'Belgium', 'Switzerland'],
    categories: ['energie', 'solaire', 'batterie'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    selectors: {
      post: 'div.post-container',
      title: 'h3.post-title',
      content: 'div.post-text'
    },
    notes: 'French science community, growing solar interest'
  },

  // ============ ITALIAN & SPANISH ============

  forumenergiasolare: {
    name: 'Forum Energia Solare (Italian)',
    url: 'https://www.forumenergiasolare.it',
    type: 'custom',
    language: 'it',
    regions: ['Italy'],
    categories: ['batterie', 'accumulo', 'impianti'],
    api: 'none',
    scraping: 'web',
    rateLimit: '5 req/min',
    notes: 'Italy solar market growing'
  },

  foroenergiasolar: {
    name: 'Foro de Energía Solar (Spanish)',
    url: 'https://www.foroenergiasolar.com',
    type: 'custom',
    language: 'es',
    regions: ['Spain', 'Latin America'],
    categories: ['baterias', 'almacenamiento', 'solar'],
    api: 'none',
    scraping: 'web',
    rateLimit: '5 req/min',
    notes: 'Spain & Latin America energy transition'
  },

  // ============ ASIA-PACIFIC ============

  australianSolarForum: {
    name: 'Australian Solar Forum',
    url: 'https://www.aussiehome.com.au',
    type: 'custom',
    language: 'en',
    regions: ['Australia'],
    categories: ['batteries', 'storage', 'solar'],
    api: 'none',
    scraping: 'web',
    rateLimit: '10 req/min',
    notes: 'High LiFePO4 adoption rate in Australia'
  },

  chineseBatteryForums: {
    name: 'Chinese Battery & EV Forums (aggregated)',
    url: 'multiple (zhihu.com, bbs.21ic.com, etc)',
    type: 'mixed',
    language: 'zh',
    regions: ['China'],
    notes: 'Needs specialized scraping, CATL/BYD primary sources',
    difficulty: 'high'
  },

  // ============ MANUFACTURER SUPPORT & NICHE ============

  bydsupport: {
    name: 'BYD Support Forums',
    url: 'https://bbs.byd.com',
    type: 'manufacturer',
    language: 'zh',
    regions: ['China', 'global'],
    api: 'none',
    notes: 'Official BYD battery Q&A'
  },

  catl: {
    name: 'CATL Community',
    url: 'https://www.catl.com',
    type: 'manufacturer',
    language: 'zh',
    regions: ['China'],
    notes: 'World largest LFP manufacturer'
  },

  lgchemSupport: {
    name: 'LG Chem Support',
    url: 'https://support.lgchem.com',
    type: 'manufacturer',
    language: 'en',
    regions: ['global'],
    notes: 'LG Chem RESU battery support'
  },

  // ============ REVIEW PLATFORMS ============

  amazonReviews: {
    name: 'Amazon Product Reviews',
    url: 'https://www.amazon.com',
    type: 'ecommerce',
    language: 'en',
    regions: ['global'],
    scraping: 'web (limited)',
    notes: 'LiFePO4 batteries, power stations, BMS reviews',
    difficulty: 'medium'
  },

  trustpilot: {
    name: 'Trustpilot Reviews',
    url: 'https://www.trustpilot.com',
    type: 'review',
    language: 'en',
    regions: ['global'],
    api: 'REST API available',
    rateLimit: '100 req/min',
    notes: 'Battery brand reviews (Victron, Pylontech, etc)'
  },

  // ============ DIY & MAKER COMMUNITIES ============

  github: {
    name: 'GitHub Discussions (DIY Battery Projects)',
    url: 'https://github.com',
    type: 'repository-discussions',
    language: 'en',
    regions: ['global'],
    searchTerms: ['lifepo4', 'battery', 'bms', 'diy'],
    api: 'GitHub API v3',
    authentication: 'OAuth2',
    notes: 'BMS projects, calculators, monitoring systems'
  },

  hackaday: {
    name: 'Hackaday.io',
    url: 'https://hackaday.io',
    type: 'maker',
    language: 'en',
    regions: ['global'],
    categories: ['power', 'energy-storage', 'ev'],
    api: 'none',
    scraping: 'web',
    notes: 'DIY battery projects, detailed technical discussions'
  },

  // ============ YOUTUBE COMMENTS (Fallback) ============

  youtube: {
    name: 'YouTube Comments',
    url: 'https://www.youtube.com',
    type: 'video-platform',
    language: 'multi',
    regions: ['global'],
    searchChannels: [
      'Will Prowse (Solar)',
      'Batteryhookup',
      'Jehu Garcia',
      'LithiumtinyHouse'
    ],
    api: 'YouTube Data API',
    authentication: 'API Key',
    rateLimit: '1M units/day',
    notes: 'High engagement, but comments are informal'
  }
};

/**
 * Helper: Get registry by priority (for sequential scraping)
 */
function getByPriority() {
  return [
    // Tier 1: High volume, API available
    FORUM_REGISTRY.reddit,
    
    // Tier 2: Active communities, web scraping
    FORUM_REGISTRY.diySolarForum,
    FORUM_REGISTRY.photovoltaikforum,
    FORUM_REGISTRY.evForumsNL,
    
    // Tier 3: Niche expertise
    FORUM_REGISTRY.endlessSphere,
    FORUM_REGISTRY.iRV2,
    FORUM_REGISTRY.elektrofahrzeugforum,
    FORUM_REGISTRY.futurasciences,
    
    // Tier 4: Reviews & niche
    FORUM_REGISTRY.trustpilot,
    FORUM_REGISTRY.amazonReviews,
    FORUM_REGISTRY.github,
    
    // Tier 5: Difficulty high / future
    FORUM_REGISTRY.chineseBatteryForums,
    FORUM_REGISTRY.youtube
  ];
}

module.exports = {
  FORUM_REGISTRY,
  getByPriority
};

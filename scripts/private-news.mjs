const NEWS_FEEDS = [
  {
    category: 'Technology',
    priority: 'must-read',
    url: 'https://news.google.com/rss/search?q=technology+AI+software&hl=en-US&gl=US&ceid=US:en',
  },
  {
    category: 'Emergency Medicine',
    priority: 'worth-scanning',
    url: 'https://news.google.com/rss/search?q=%22emergency+medicine%22+OR+trauma+OR+triage&hl=en-US&gl=US&ceid=US:en',
  },
  {
    category: 'Biopharm',
    priority: 'worth-scanning',
    url: 'https://news.google.com/rss/search?q=biopharma+OR+biotech+therapeutics+FDA&hl=en-US&gl=US&ceid=US:en',
  },
  {
    category: 'Research',
    priority: 'niche-but-relevant',
    url: 'https://news.google.com/rss/search?q=%22research+findings%22+science+study&hl=en-US&gl=US&ceid=US:en',
  },
  {
    category: 'USA Politics',
    priority: 'must-read',
    url: 'https://news.google.com/rss/search?q=US+politics+elections+Congress+Supreme+Court&hl=en-US&gl=US&ceid=US:en',
  },
  {
    category: 'World Politics',
    priority: 'worth-scanning',
    url: 'https://news.google.com/rss/search?q=world+politics+leaders+diplomacy&hl=en-US&gl=US&ceid=US:en',
  },
  {
    category: 'Markets',
    priority: 'worth-scanning',
    url: 'https://news.google.com/rss/search?q=markets+stocks+economy+fed&hl=en-US&gl=US&ceid=US:en',
  },
];

const MAX_ITEMS_PER_FEED = 4;
const MAX_SUMMARY_ARTICLES = 18;
const FEED_FETCH_TIMEOUT_MS = 3500;
const AI_SUMMARY_TIMEOUT_MS = 5000;

function decodeHtml(text = '') {
  return text
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(text = '') {
  return decodeHtml(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripTags(match[1]) : '';
}

function extractLink(block) {
  const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (linkMatch) return stripTags(linkMatch[1]);
  const atomMatch = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
  return atomMatch ? atomMatch[1] : '';
}

function parseSourceTitle(title = '') {
  const parts = title.split(' - ');
  return parts.length > 1 ? parts.at(-1).trim() : 'Source';
}

function parseFeedXml(xml, category, priority) {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, MAX_ITEMS_PER_FEED).map((block, index) => {
    const title = extractTag(block, 'title');
    const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    const publishedAt = extractTag(block, 'pubDate') || extractTag(block, 'published') || new Date().toISOString();
    const link = extractLink(block);
    const sourceTitle = parseSourceTitle(title);
    const canonicalTitle = title.replace(/\s+-\s+[^-]+$/, '').trim();
    const topicKey = `${category.toLowerCase().replace(/\s+/g, '-')}:${canonicalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

    return {
      id: `${topicKey}-${index + 1}`,
      topicKey,
      title: canonicalTitle || title,
      category,
      priority,
      articleTitle: title,
      summary: description,
      publishedAt: new Date(publishedAt).toISOString(),
      url: link,
      sourceTitle,
    };
  });
}

async function fetchSingleFeed(feed) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Leaderman private briefing',
      },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return parseFeedXml(xml, feed.category, feed.priority);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFeedArticles() {
  const results = await Promise.all(NEWS_FEEDS.map((feed) => fetchSingleFeed(feed)));
  return results.flat();
}

function trimArticlesForSummary(articles) {
  return [...articles]
    .sort((left, right) => (right.publishedAt || '').localeCompare(left.publishedAt || ''))
    .slice(0, MAX_SUMMARY_ARTICLES);
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

async function summarizeNewsArticles(articles, apiKey) {
  const prompt = [
    'You are the Leaderman private news briefing engine.',
    'Use only the supplied article titles, snippets, categories, timestamps, and source names.',
    'Do not invent facts, dates, causal claims, or quotations that are not supported by the provided article data.',
    'Group duplicate or near-duplicate stories by topicKey.',
    'Return strict JSON with this shape:',
    '{"stories":[{"topicKey":"","title":"","category":"","priority":"must-read|worth-scanning|niche-but-relevant","whatHappened":"","whyItMatters":"","neutralAnalysis":"","whatIsKnown":"","whatIsUncertain":"","whatToWatch":"","backgroundContext":"","entities":[],"eventType":"","relatedTopics":[],"sourceUrls":[],"sources":[{"title":"","url":""}],"publishedAt":""}]}',
    'Keep compact-card content short. "whatHappened" should be 1-2 sentences.',
    'If the supplied sources are thin, say so in uncertainty fields rather than guessing.',
  ].join('\n');

  const input = articles.map((article) => [
    `topicKey: ${article.topicKey}`,
    `category: ${article.category}`,
    `priority: ${article.priority}`,
    `title: ${article.articleTitle}`,
    `canonicalTitle: ${article.title}`,
    `publishedAt: ${article.publishedAt}`,
    `sourceTitle: ${article.sourceTitle}`,
    `url: ${article.url}`,
    `summary: ${(article.summary || '').slice(0, 280)}`,
  ].join('\n')).join('\n\n---\n\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      max_output_tokens: 2200,
      instructions: prompt,
      input: [
        {
          role: 'user',
          content: input,
        },
      ],
    }),
  });

  const payload = await response.json();
  const text = payload.output_text || payload.output?.map((item) => item?.content?.map((content) => content?.text).join('\n')).join('\n') || '';
  const jsonBlock = text.match(/\{[\s\S]*\}/);
  if (!jsonBlock) throw new Error('Could not parse the news briefing response.');
  return JSON.parse(jsonBlock[0]);
}

function fallbackStories(articles) {
  const byTopic = new Map();
  for (const article of articles) {
    const current = byTopic.get(article.topicKey) || {
      topicKey: article.topicKey,
      title: article.title,
      category: article.category,
      priority: article.priority,
      whatHappened: stripTags(article.summary).slice(0, 260),
      whyItMatters: '',
      neutralAnalysis: '',
      whatIsKnown: stripTags(article.summary).slice(0, 260),
      whatIsUncertain: 'Private AI summarization was unavailable for this refresh.',
      whatToWatch: '',
      backgroundContext: '',
      entities: [],
      eventType: '',
      relatedTopics: [article.category.toLowerCase().replace(/\s+/g, '-')],
      sourceUrls: [],
      sources: [],
      publishedAt: article.publishedAt,
    };
    current.sourceUrls = [...new Set([...current.sourceUrls, article.url].filter(Boolean))];
    current.sources = [...new Map([...current.sources, { title: article.sourceTitle, url: article.url }].map((source) => [source.url, source])).values()];
    byTopic.set(article.topicKey, current);
  }
  return { stories: [...byTopic.values()] };
}

export async function buildPrivateNewsBriefing({ apiKey }) {
  const articles = await fetchFeedArticles();
  if (articles.length === 0) {
    return {
      stories: [],
      refreshedAt: new Date().toISOString(),
    };
  }

  const summaryArticles = trimArticlesForSummary(articles);
  const briefing = apiKey
    ? await withTimeout(
        summarizeNewsArticles(summaryArticles, apiKey),
        AI_SUMMARY_TIMEOUT_MS,
        'AI summarization timed out.',
      ).catch(() => fallbackStories(articles))
    : fallbackStories(articles);

  return {
    stories: (briefing.stories || []).map((story, index) => ({
      id: story.id || `${story.topicKey || `story-${index + 1}`}`,
      topicKey: story.topicKey || `story-${index + 1}`,
      title: story.title,
      category: story.category,
      priority: story.priority || 'worth-scanning',
      whatHappened: story.whatHappened,
      whyItMatters: story.whyItMatters || '',
      neutralAnalysis: story.neutralAnalysis || '',
      whatIsKnown: story.whatIsKnown || '',
      whatIsUncertain: story.whatIsUncertain || '',
      whatToWatch: story.whatToWatch || '',
      backgroundContext: story.backgroundContext || '',
      entities: story.entities || [],
      eventType: story.eventType || '',
      relatedTopics: story.relatedTopics || [story.category?.toLowerCase().replace(/\s+/g, '-')].filter(Boolean),
      sourceUrls: story.sourceUrls || [],
      sources: story.sources || [],
      publishedAt: story.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'fresh',
    })),
    refreshedAt: new Date().toISOString(),
  };
}

export async function expandPrivateNewsStory({ story, apiKey }) {
  const prompt = [
    'You are the Leaderman private news expansion engine.',
    'Use only the supplied compact story fields and sources.',
    'Do not invent facts, quotes, dates, or analysis that is not supported by the provided material.',
    'Return Markdown with these exact sections:',
    '## Why It Matters',
    '## Neutral Analysis',
    '## What Is Known',
    '## What Is Uncertain',
    '## What To Watch',
    '## Background Context',
  ].join('\n');

  const input = [
    `Title: ${story.title}`,
    `Category: ${story.category}`,
    `What happened: ${story.whatHappened}`,
    `Why it matters: ${story.whyItMatters || 'Not yet expanded.'}`,
    `What is known: ${story.whatIsKnown || 'Not yet expanded.'}`,
    `What is uncertain: ${story.whatIsUncertain || 'Not yet expanded.'}`,
    `Sources:\n${(story.sources || []).map((source) => `- ${source.title}: ${source.url}`).join('\n')}`,
  ].join('\n\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      max_output_tokens: 1200,
      instructions: prompt,
      input: [
        {
          role: 'user',
          content: input,
        },
      ],
    }),
  });

  const payload = await response.json();
  return payload.output_text || payload.output?.map((item) => item?.content?.map((content) => content?.text).join('\n')).join('\n') || '';
}

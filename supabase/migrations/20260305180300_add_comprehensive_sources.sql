-- Add comprehensive RSS sources for cannabis, AI, tech, and science news
-- This migration adds 50+ high-quality sources to dramatically increase article volume

-- Cannabis Industry Sources (20 sources)
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('MJBizDaily', 'RSS', 'Leading cannabis business news and analysis', 
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Marijuana Moment', 'RSS', 'Cannabis policy and legalization news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Leafly News', 'RSS', 'Cannabis culture, science, and business',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('High Times', 'RSS', 'Cannabis culture and industry news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cannabis Business Times', 'RSS', 'Cultivation and business insights',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Green Market Report', 'RSS', 'Cannabis market intelligence',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Marijuana Business Magazine', 'RSS', 'Cannabis business strategy and trends',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cannabis Tech', 'RSS', 'Cannabis technology and innovation',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('NORML News', 'RSS', 'Cannabis law reform and advocacy',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Ganjapreneur', 'RSS', 'Cannabis entrepreneurship and business',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cannabis Now', 'RSS', 'Cannabis culture and lifestyle',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('The Cannabist', 'RSS', 'Cannabis news and culture',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Hemp Industry Daily', 'RSS', 'Hemp and CBD business news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Marijuana Retail Report', 'RSS', 'Cannabis retail and dispensary news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cannabis Wire', 'RSS', 'Cannabis policy and business journalism',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Weedmaps News', 'RSS', 'Cannabis news and education',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Civilized', 'RSS', 'Cannabis culture and lifestyle',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Green Entrepreneur', 'RSS', 'Cannabis business and entrepreneurship',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cannabis Science Tech', 'RSS', 'Cannabis research and technology',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Marijuana Venture', 'RSS', 'Cannabis business magazine',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- AI and Machine Learning Sources (25 sources)
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('TechCrunch AI', 'RSS', 'AI startup and product news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('The Verge AI', 'RSS', 'AI technology and culture coverage',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Ars Technica AI', 'RSS', 'In-depth AI technology analysis',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Wired AI', 'RSS', 'AI impact on society and technology',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('AI Weekly', 'RSS', 'Weekly AI news roundup',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Papers with Code', 'RSS', 'Latest ML research papers with code',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Towards Data Science', 'RSS', 'Data science and ML tutorials',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Machine Learning Mastery', 'RSS', 'Practical ML tutorials',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('DeepMind Blog', 'RSS', 'DeepMind AI research and news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Meta AI Blog', 'RSS', 'Meta AI research and products',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Microsoft AI Blog', 'RSS', 'Microsoft AI and Azure ML news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('AWS Machine Learning Blog', 'RSS', 'AWS ML services and tutorials',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('NVIDIA AI Blog', 'RSS', 'NVIDIA AI hardware and software',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Stability AI Blog', 'RSS', 'Stable Diffusion and generative AI',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Cohere AI Blog', 'RSS', 'Enterprise LLM news and updates',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('AI Alignment Forum', 'RSS', 'AI safety and alignment research',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('LessWrong AI', 'RSS', 'AI rationality and safety discussions',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Import AI', 'RSS', 'Weekly AI research newsletter',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('The Gradient', 'RSS', 'AI research and perspectives',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Synced AI', 'RSS', 'Global AI news and research',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('AI Business', 'RSS', 'Enterprise AI adoption and strategy',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Analytics Vidhya', 'RSS', 'Data science and AI tutorials',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('KDnuggets', 'RSS', 'Data science and ML news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('AI Trends', 'RSS', 'AI industry trends and analysis',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Unite.AI', 'RSS', 'AI news and product reviews',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- General Tech and Science Sources (15 sources)
INSERT INTO sources (name, type, description, license_policy) VALUES
  ('Reuters Technology', 'RSS', 'Global technology news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Bloomberg Technology', 'RSS', 'Tech business and markets',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('WSJ Tech', 'RSS', 'Wall Street Journal technology coverage',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Forbes Tech', 'RSS', 'Technology business news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('CNBC Tech', 'RSS', 'Technology and business news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('The Information', 'RSS', 'Tech industry insider news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Protocol', 'RSS', 'Tech policy and business',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Hacker News', 'RSS', 'Tech community news aggregator',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Nature News', 'RSS', 'Scientific research news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Science Daily', 'RSS', 'Latest research news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Phys.org', 'RSS', 'Science and technology news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('ScienceNews', 'RSS', 'Science journalism',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('New Scientist', 'RSS', 'Science and technology news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('Quanta Magazine', 'RSS', 'Math and science journalism',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb),
  ('IEEE Spectrum', 'RSS', 'Engineering and technology news',
   '{"mode": "snippet_only", "snippet_length": 500, "attribution_required": true, "redistribution_allowed": true}'::jsonb);

-- Insert RSS endpoints for Cannabis sources
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active)
SELECT 
  s.id,
  'Main Feed',
  CASE s.name
    WHEN 'MJBizDaily' THEN 'https://mjbizdaily.com/feed/'
    WHEN 'Marijuana Moment' THEN 'https://www.marijuanamoment.net/feed/'
    WHEN 'Leafly News' THEN 'https://www.leafly.com/news/feed'
    WHEN 'High Times' THEN 'https://hightimes.com/feed/'
    WHEN 'Cannabis Business Times' THEN 'https://www.cannabisbusinesstimes.com/rss.xml'
    WHEN 'Green Market Report' THEN 'https://www.greenmarketreport.com/feed/'
    WHEN 'Marijuana Business Magazine' THEN 'https://mjbizdaily.com/feed/'
    WHEN 'Cannabis Tech' THEN 'https://www.cannabistech.com/feed/'
    WHEN 'NORML News' THEN 'https://norml.org/news/feed/'
    WHEN 'Ganjapreneur' THEN 'https://www.ganjapreneur.com/feed/'
    WHEN 'Cannabis Now' THEN 'https://cannabisnow.com/feed/'
    WHEN 'The Cannabist' THEN 'https://www.thecannabist.co/feed/'
    WHEN 'Hemp Industry Daily' THEN 'https://hempindustrydaily.com/feed/'
    WHEN 'Marijuana Retail Report' THEN 'https://mjbizdaily.com/feed/'
    WHEN 'Cannabis Wire' THEN 'https://cannabiswire.com/feed/'
    WHEN 'Weedmaps News' THEN 'https://weedmaps.com/news/feed/'
    WHEN 'Civilized' THEN 'https://www.civilized.life/feed/'
    WHEN 'Green Entrepreneur' THEN 'https://www.greenentrepreneur.com/rss.xml'
    WHEN 'Cannabis Science Tech' THEN 'https://cannatechtoday.com/feed/'
    WHEN 'Marijuana Venture' THEN 'https://www.marijuanaventure.com/feed/'
  END,
  '*/30 * * * *', -- Every 30 minutes
  true
FROM sources s
WHERE s.name IN (
  'MJBizDaily', 'Marijuana Moment', 'Leafly News', 'High Times', 'Cannabis Business Times',
  'Green Market Report', 'Marijuana Business Magazine', 'Cannabis Tech', 'NORML News',
  'Ganjapreneur', 'Cannabis Now', 'The Cannabist', 'Hemp Industry Daily',
  'Marijuana Retail Report', 'Cannabis Wire', 'Weedmaps News', 'Civilized',
  'Green Entrepreneur', 'Cannabis Science Tech', 'Marijuana Venture'
);

-- Insert RSS endpoints for AI sources
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active)
SELECT 
  s.id,
  'Main Feed',
  CASE s.name
    WHEN 'TechCrunch AI' THEN 'https://techcrunch.com/category/artificial-intelligence/feed/'
    WHEN 'The Verge AI' THEN 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml'
    WHEN 'Ars Technica AI' THEN 'https://feeds.arstechnica.com/arstechnica/technology-lab'
    WHEN 'Wired AI' THEN 'https://www.wired.com/feed/tag/ai/latest/rss'
    WHEN 'AI Weekly' THEN 'http://aiweekly.co/feed.xml'
    WHEN 'Papers with Code' THEN 'https://paperswithcode.com/feeds/latest/'
    WHEN 'Towards Data Science' THEN 'https://towardsdatascience.com/feed'
    WHEN 'Machine Learning Mastery' THEN 'https://machinelearningmastery.com/feed/'
    WHEN 'DeepMind Blog' THEN 'https://deepmind.google/blog/rss.xml'
    WHEN 'Meta AI Blog' THEN 'https://ai.meta.com/blog/rss/'
    WHEN 'Microsoft AI Blog' THEN 'https://blogs.microsoft.com/ai/feed/'
    WHEN 'AWS Machine Learning Blog' THEN 'https://aws.amazon.com/blogs/machine-learning/feed/'
    WHEN 'NVIDIA AI Blog' THEN 'https://blogs.nvidia.com/feed/'
    WHEN 'Stability AI Blog' THEN 'https://stability.ai/news/rss'
    WHEN 'Cohere AI Blog' THEN 'https://cohere.com/blog/rss.xml'
    WHEN 'AI Alignment Forum' THEN 'https://www.alignmentforum.org/feed.xml'
    WHEN 'LessWrong AI' THEN 'https://www.lesswrong.com/feed.xml'
    WHEN 'Import AI' THEN 'https://jack-clark.net/feed/'
    WHEN 'The Gradient' THEN 'https://thegradient.pub/rss/'
    WHEN 'Synced AI' THEN 'https://syncedreview.com/feed/'
    WHEN 'AI Business' THEN 'https://aibusiness.com/rss.xml'
    WHEN 'Analytics Vidhya' THEN 'https://www.analyticsvidhya.com/feed/'
    WHEN 'KDnuggets' THEN 'https://www.kdnuggets.com/feed'
    WHEN 'AI Trends' THEN 'https://www.aitrends.com/feed/'
    WHEN 'Unite.AI' THEN 'https://www.unite.ai/feed/'
  END,
  '*/30 * * * *', -- Every 30 minutes
  true
FROM sources s
WHERE s.name IN (
  'TechCrunch AI', 'The Verge AI', 'Ars Technica AI', 'Wired AI', 'AI Weekly',
  'Papers with Code', 'Towards Data Science', 'Machine Learning Mastery', 'DeepMind Blog',
  'Meta AI Blog', 'Microsoft AI Blog', 'AWS Machine Learning Blog', 'NVIDIA AI Blog',
  'Stability AI Blog', 'Cohere AI Blog', 'AI Alignment Forum', 'LessWrong AI',
  'Import AI', 'The Gradient', 'Synced AI', 'AI Business', 'Analytics Vidhya',
  'KDnuggets', 'AI Trends', 'Unite.AI'
);

-- Insert RSS endpoints for General Tech/Science sources
INSERT INTO source_endpoints (source_id, name, endpoint_url, polling_schedule, is_active)
SELECT 
  s.id,
  'Main Feed',
  CASE s.name
    WHEN 'Reuters Technology' THEN 'https://www.reuters.com/technology/rss'
    WHEN 'Bloomberg Technology' THEN 'https://www.bloomberg.com/technology/feed'
    WHEN 'WSJ Tech' THEN 'https://feeds.a.dj.com/rss/RSSWSJD.xml'
    WHEN 'Forbes Tech' THEN 'https://www.forbes.com/technology/feed/'
    WHEN 'CNBC Tech' THEN 'https://www.cnbc.com/id/19854910/device/rss/rss.html'
    WHEN 'The Information' THEN 'https://www.theinformation.com/feed'
    WHEN 'Protocol' THEN 'https://www.protocol.com/feeds/feed.rss'
    WHEN 'Hacker News' THEN 'https://news.ycombinator.com/rss'
    WHEN 'Nature News' THEN 'https://www.nature.com/nature.rss'
    WHEN 'Science Daily' THEN 'https://www.sciencedaily.com/rss/all.xml'
    WHEN 'Phys.org' THEN 'https://phys.org/rss-feed/'
    WHEN 'ScienceNews' THEN 'https://www.sciencenews.org/feed'
    WHEN 'New Scientist' THEN 'https://www.newscientist.com/feed/home'
    WHEN 'Quanta Magazine' THEN 'https://www.quantamagazine.org/feed/'
    WHEN 'IEEE Spectrum' THEN 'https://spectrum.ieee.org/feeds/feed.rss'
  END,
  '*/30 * * * *', -- Every 30 minutes
  true
FROM sources s
WHERE s.name IN (
  'Reuters Technology', 'Bloomberg Technology', 'WSJ Tech', 'Forbes Tech', 'CNBC Tech',
  'The Information', 'Protocol', 'Hacker News', 'Nature News', 'Science Daily',
  'Phys.org', 'ScienceNews', 'New Scientist', 'Quanta Magazine', 'IEEE Spectrum'
);

-- Add image_url column to signal_items for feature images from RSS feeds
ALTER TABLE signal_items ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN signal_items.image_url IS 'Feature image URL extracted from RSS media:content, media:thumbnail, enclosure, or inline img tags';

-- Add crop positioning fields to news_articles table
-- These store the object-position percentages for hero and card image views

ALTER TABLE public.news_articles
ADD COLUMN IF NOT EXISTS hero_crop jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS card_crop jsonb DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.news_articles.hero_crop IS 'Crop position for hero image: { x: number (0-100%), y: number (0-100%), scale: number (1-3) }';
COMMENT ON COLUMN public.news_articles.card_crop IS 'Crop position for card image: { x: number (0-100%), y: number (0-100%), scale: number (1-3) }';
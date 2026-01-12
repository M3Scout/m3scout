-- Create news_articles table
CREATE TABLE public.news_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  publish_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'published')),
  CONSTRAINT valid_category CHECK (category IN ('Institucional', 'Atletas', 'Parcerias', 'Mercado', 'Internacional'))
);

-- Enable Row Level Security
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view published news"
ON public.news_articles
FOR SELECT
USING (status = 'published');

CREATE POLICY "Admins can view all news"
ON public.news_articles
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create news"
ON public.news_articles
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update news"
ON public.news_articles
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete news"
ON public.news_articles
FOR DELETE
USING (is_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_news_articles_updated_at
BEFORE UPDATE ON public.news_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster slug lookups
CREATE INDEX idx_news_articles_slug ON public.news_articles(slug);
CREATE INDEX idx_news_articles_status_publish_date ON public.news_articles(status, publish_date DESC);
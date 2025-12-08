-- ============================================
-- Database Updates for IlGiornaleScolastico
-- Updated: 2025-01-08
-- ============================================

-- Add session management for device logout feature
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- Function to invalidate all other sessions on login
CREATE OR REPLACE FUNCTION invalidate_other_sessions(p_user_id UUID, p_current_session UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_sessions
    SET is_active = false
    WHERE user_id = p_user_id 
    AND id != p_current_session
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add reading_time to articles
ALTER TABLE articoli 
ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER DEFAULT 5;

-- Add tags support
CREATE TABLE IF NOT EXISTS article_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_tag_relations (
    article_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES article_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Add bookmarks feature
CREATE TABLE IF NOT EXISTS article_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON article_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_article ON article_bookmarks(article_id);

-- Add comments feature
CREATE TABLE IF NOT EXISTS article_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON article_comments(is_approved);

-- Add article statistics tracking
CREATE TABLE IF NOT EXISTS article_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(article_id)
);

-- Add social media sharing tracking
CREATE TABLE IF NOT EXISTS article_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    platform TEXT NOT NULL, -- 'facebook', 'twitter', 'whatsapp', 'email'
    shared_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shares_article ON article_shares(article_id);
CREATE INDEX IF NOT EXISTS idx_shares_platform ON article_shares(platform);

-- Update newsletter configuration (Resend API)
ALTER TABLE iscrizioni_newsletter 
ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE;

-- Generate unsubscribe tokens for existing records
UPDATE iscrizioni_newsletter 
SET unsubscribe_token = gen_random_uuid()::text 
WHERE unsubscribe_token IS NULL;

-- Create configuration table for API keys (stored securely)
CREATE TABLE IF NOT EXISTS app_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    is_sensitive BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Note: In production, use Supabase Vault or environment variables for API keys
-- This is just for reference
INSERT INTO app_configuration (config_key, config_value, is_sensitive)
VALUES 
    ('resend_api_key', 're_TdwD1rg2_33toySQdNwgiCuNEwCEXQbWY', true),
    ('site_name', 'Giornale Cesaris', false),
    ('site_url', 'https://bitfly12.github.io/IlGiornaleScolastico/', false)
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Add RSS feed generation support
CREATE TABLE IF NOT EXISTS rss_feed_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_content TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- Function to increment article views (optimized)
CREATE OR REPLACE FUNCTION increment_article_views(p_article_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE articoli
    SET visualizzazioni = COALESCE(visualizzazioni, 0) + 1
    WHERE id = p_article_id;
    
    -- Also update stats table
    INSERT INTO article_stats (article_id, views_count, last_updated)
    VALUES (p_article_id, 1, NOW())
    ON CONFLICT (article_id) DO UPDATE
    SET views_count = article_stats.views_count + 1,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get popular articles
CREATE OR REPLACE FUNCTION get_popular_articles(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    titolo TEXT,
    visualizzazioni INTEGER,
    data_pubblicazione TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.titolo, a.visualizzazioni, a.data_pubblicazione
    FROM articoli a
    WHERE a.stato = 'pubblicato'
    ORDER BY a.visualizzazioni DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get related articles based on category and tags
CREATE OR REPLACE FUNCTION get_related_articles(p_article_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    titolo TEXT,
    sommario TEXT,
    categoria TEXT
) AS $$
DECLARE
    v_category TEXT;
BEGIN
    -- Get the category of the source article
    SELECT categoria INTO v_category
    FROM articoli
    WHERE id = p_article_id;
    
    RETURN QUERY
    SELECT a.id, a.titolo, a.sommario, a.categoria
    FROM articoli a
    WHERE a.id != p_article_id
      AND a.stato = 'pubblicato'
      AND a.categoria = v_category
    ORDER BY a.data_pubblicazione DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add article reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articoli(id) ON DELETE CASCADE,
    progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_position TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Function to calculate reading time
CREATE OR REPLACE FUNCTION calculate_reading_time(p_content TEXT)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
    reading_speed INTEGER := 200; -- words per minute
BEGIN
    -- Count words (approximation)
    word_count := array_length(regexp_split_to_array(p_content, '\s+'), 1);
    
    -- Calculate minutes (minimum 1 minute)
    RETURN GREATEST(1, CEIL(word_count::FLOAT / reading_speed));
END;
$$ LANGUAGE plpgsql;

-- Auto-update reading time on article save
CREATE OR REPLACE FUNCTION update_reading_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.reading_time_minutes := calculate_reading_time(NEW.contenuto);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reading_time ON articoli;
CREATE TRIGGER trigger_update_reading_time
    BEFORE INSERT OR UPDATE OF contenuto ON articoli
    FOR EACH ROW
    EXECUTE FUNCTION update_reading_time();

-- Add author profiles enhancements
ALTER TABLE profili_redattori
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS social_twitter TEXT,
ADD COLUMN IF NOT EXISTS social_instagram TEXT,
ADD COLUMN IF NOT EXISTS social_linkedin TEXT,
ADD COLUMN IF NOT EXISTS specializzazione TEXT;

-- Create view for article analytics
CREATE OR REPLACE VIEW article_analytics AS
SELECT 
    a.id,
    a.titolo,
    a.categoria,
    a.data_pubblicazione,
    a.visualizzazioni,
    COALESCE(c.comment_count, 0) as comments_count,
    COALESCE(b.bookmark_count, 0) as bookmarks_count,
    COALESCE(s.shares_count, 0) as shares_count,
    pr.nome_visualizzato as author_name
FROM articoli a
LEFT JOIN (
    SELECT article_id, COUNT(*) as comment_count
    FROM article_comments
    WHERE is_approved = true
    GROUP BY article_id
) c ON a.id = c.article_id
LEFT JOIN (
    SELECT article_id, COUNT(*) as bookmark_count
    FROM article_bookmarks
    GROUP BY article_id
) b ON a.id = b.article_id
LEFT JOIN (
    SELECT article_id, COUNT(*) as shares_count
    FROM article_shares
    GROUP BY article_id
) s ON a.id = s.article_id
LEFT JOIN profili_redattori pr ON a.autore_id = pr.id
WHERE a.stato = 'pubblicato';

-- Grant permissions (adjust based on your RLS policies)
GRANT SELECT ON article_analytics TO authenticated;
GRANT SELECT, INSERT ON article_bookmarks TO authenticated;
GRANT SELECT, INSERT ON article_comments TO authenticated;
GRANT SELECT, INSERT ON article_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE ON reading_progress TO authenticated;

-- Comments
COMMENT ON TABLE user_sessions IS 'Tracks user sessions for device logout feature';
COMMENT ON TABLE article_bookmarks IS 'User bookmarks for articles';
COMMENT ON TABLE article_comments IS 'Comments on articles with moderation';
COMMENT ON TABLE article_tags IS 'Tags for categorizing articles';
COMMENT ON TABLE article_shares IS 'Track social media shares';
COMMENT ON TABLE reading_progress IS 'Track user reading progress on articles';
COMMENT ON VIEW article_analytics IS 'Comprehensive analytics view for articles';

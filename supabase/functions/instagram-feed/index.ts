import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  // CACHE: Stale-while-revalidate strategy - serve cached, update in background
  'Cache-Control': 'public, max-age=600, stale-while-revalidate=1200', // 10min fresh, 20min stale OK
};

interface InstagramMedia {
  id: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
}

interface InstagramResponse {
  data: InstagramMedia[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

interface TokenRecord {
  id: string;
  access_token: string;
  expires_at: string | null;
}

interface CachedFeed {
  posts: Array<{
    id: string;
    imageUrl: string;
    permalink: string;
    caption: string;
    mediaType: string;
    timestamp: string;
  }>;
  cached_at: string;
}

// In-memory cache for edge function (persists between warm invocations)
let memoryCache: CachedFeed | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function isCacheValid(): boolean {
  if (!memoryCache) return false;
  const cachedAt = new Date(memoryCache.cached_at).getTime();
  return Date.now() - cachedAt < CACHE_TTL_MS;
}

// Get the access token, preferring database over env var
// deno-lint-ignore no-explicit-any
async function getAccessToken(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from('instagram_tokens')
    .select('id, access_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1);

  const tokenData = (Array.isArray(data) ? data[0] ?? null : null) as TokenRecord | null;

  if (tokenData && tokenData.access_token && tokenData.access_token !== 'pending') {
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry < 7 && daysUntilExpiry > 0) {
        console.log(`Token expires in ${daysUntilExpiry.toFixed(1)} days, attempting refresh...`);
        const refreshed = await refreshToken(supabase, tokenData.access_token);
        if (refreshed) return refreshed;
      }
    }
    return tokenData.access_token;
  }

  const envToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  if (envToken) {
    await supabase.from('instagram_tokens').upsert({
      id: tokenData?.id || undefined,
      access_token: envToken,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return envToken;
  }

  return null;
}

// deno-lint-ignore no-explicit-any
async function refreshToken(supabase: any, currentToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
    );
    
    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5184000;

    await supabase.from('instagram_tokens').update({
      access_token: newToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_refreshed_at: new Date().toISOString(),
    }).eq('access_token', currentToken);

    console.log('Token refreshed successfully');
    return newToken;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // CACHE HIT: Return cached data immediately if valid
  if (isCacheValid() && memoryCache) {
    console.log('[CACHE HIT] Returning cached Instagram feed');
    return new Response(
      JSON.stringify({ posts: memoryCache.posts, cached: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // STALE CACHE: If we have stale data, return it and refresh in background
  const hasStaleData = memoryCache !== null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getAccessToken(supabase);
    
    if (!accessToken) {
      console.error('No Instagram access token available');
      // Return stale data if available
      if (hasStaleData) {
        return new Response(
          JSON.stringify({ posts: memoryCache!.posts, cached: true, stale: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Instagram access token not configured', posts: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching fresh Instagram feed...');
    const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';
    const limit = 12;
    
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Instagram API error:', response.status, errorData);
      
      // Return stale data if available
      if (hasStaleData) {
        console.log('[STALE] Returning stale cache due to API error');
        return new Response(
          JSON.stringify({ posts: memoryCache!.posts, cached: true, stale: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 400 || response.status === 401) {
        const refreshed = await refreshToken(supabase, accessToken);
        if (refreshed) {
          const retryResponse = await fetch(
            `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${refreshed}`
          );
          if (retryResponse.ok) {
            const retryData: InstagramResponse = await retryResponse.json();
            const posts = (retryData.data || []).map((media) => ({
              id: media.id,
              imageUrl: (media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url) || '',
              permalink: media.permalink,
              caption: media.caption?.substring(0, 100) || '',
              mediaType: media.media_type,
              timestamp: media.timestamp,
            }));
            
            // Update cache
            memoryCache = { posts, cached_at: new Date().toISOString() };
            
            return new Response(
              JSON.stringify({ posts }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: 'Instagram token invalid', posts: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Instagram API returned ${response.status}`);
    }

    const data: InstagramResponse = await response.json();
    console.log(`[FRESH] Fetched ${data.data?.length || 0} posts from Instagram`);

    const posts = (data.data || []).map((media) => ({
      id: media.id,
      imageUrl: (media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url) || '',
      permalink: media.permalink,
      caption: media.caption?.substring(0, 100) || '',
      mediaType: media.media_type,
      timestamp: media.timestamp,
    }));

    // Update cache
    memoryCache = { posts, cached_at: new Date().toISOString() };

    return new Response(
      JSON.stringify({ posts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Instagram feed';
    console.error('Error fetching Instagram feed:', errorMessage);
    
    // Return stale data if available
    if (hasStaleData) {
      console.log('[STALE] Returning stale cache due to error');
      return new Response(
        JSON.stringify({ posts: memoryCache!.posts, cached: true, stale: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage, posts: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

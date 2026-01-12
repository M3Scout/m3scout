import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Get the access token, preferring database over env var
// deno-lint-ignore no-explicit-any
async function getAccessToken(supabase: any): Promise<string | null> {
  // First try to get from database
  const { data, error } = await supabase
    .from('instagram_tokens')
    .select('id, access_token, expires_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  const tokenData = data as TokenRecord | null;

  if (tokenData && tokenData.access_token && tokenData.access_token !== 'pending') {
    // Check if token is expiring soon (within 7 days)
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry < 7 && daysUntilExpiry > 0) {
        console.log(`Token expires in ${daysUntilExpiry.toFixed(1)} days, attempting refresh...`);
        const refreshed = await refreshToken(supabase, tokenData.access_token);
        if (refreshed) return refreshed;
      }
    }
    return tokenData.access_token;
  }

  // Fall back to environment variable
  const envToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  if (envToken) {
    // Store env token in database for future use
    await supabase.from('instagram_tokens').upsert({
      id: tokenData?.id || undefined,
      access_token: envToken,
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return envToken;
  }

  return null;
}

// Refresh a long-lived token
// deno-lint-ignore no-explicit-any
async function refreshToken(supabase: any, currentToken: string): Promise<string | null> {
  try {
    const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
    const response = await fetch(refreshUrl);
    
    if (!response.ok) {
      console.error('Token refresh failed:', await response.text());
      return null;
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5184000; // Default 60 days

    // Update token in database
    await supabase.from('instagram_tokens').update({
      access_token: newToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_refreshed_at: new Date().toISOString(),
    }).eq('access_token', currentToken);

    console.log('Token refreshed successfully, expires in', Math.floor(expiresIn / 86400), 'days');
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

  try {
    // Create Supabase client with service role for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getAccessToken(supabase);
    
    if (!accessToken) {
      console.error('No Instagram access token available');
      return new Response(
        JSON.stringify({ error: 'Instagram access token not configured', posts: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Instagram feed...');

    const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';
    const limit = 12;
    const instagramUrl = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    
    const response = await fetch(instagramUrl);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Instagram API error:', response.status, errorData);
      
      // If token is invalid, try refreshing
      if (response.status === 400 || response.status === 401) {
        const refreshed = await refreshToken(supabase, accessToken);
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetch(
            `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${refreshed}`
          );
          if (retryResponse.ok) {
            const retryData: InstagramResponse = await retryResponse.json();
            const posts = (retryData.data || []).map((media) => ({
              id: media.id,
              imageUrl: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url,
              permalink: media.permalink,
              caption: media.caption?.substring(0, 100) || '',
              mediaType: media.media_type,
              timestamp: media.timestamp,
            }));
            return new Response(
              JSON.stringify({ posts }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ error: 'Instagram token invalid or expired', posts: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Instagram API returned ${response.status}`);
    }

    const data: InstagramResponse = await response.json();
    console.log(`Successfully fetched ${data.data?.length || 0} posts from Instagram`);

    const posts = (data.data || []).map((media) => ({
      id: media.id,
      imageUrl: media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url,
      permalink: media.permalink,
      caption: media.caption?.substring(0, 100) || '',
      mediaType: media.media_type,
      timestamp: media.timestamp,
    }));

    return new Response(
      JSON.stringify({ posts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Instagram feed';
    console.error('Error fetching Instagram feed:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage, posts: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('INSTAGRAM_ACCESS_TOKEN is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Instagram access token not configured',
          posts: [] 
        }),
        { 
          status: 200, // Return 200 with empty posts instead of error
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Fetching Instagram feed...');

    // Fetch user's media from Instagram Basic Display API
    const fields = 'id,media_type,media_url,thumbnail_url,permalink,caption,timestamp';
    const limit = 12; // Fetch up to 12 posts
    
    const instagramUrl = `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    
    const response = await fetch(instagramUrl);
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Instagram API error:', response.status, errorData);
      
      // Check if token expired
      if (response.status === 400 || response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Instagram token may be expired or invalid',
            posts: [] 
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw new Error(`Instagram API returned ${response.status}`);
    }

    const data: InstagramResponse = await response.json();
    
    console.log(`Successfully fetched ${data.data?.length || 0} posts from Instagram`);

    // Transform the data to a simpler format
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
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Instagram feed';
    console.error('Error fetching Instagram feed:', errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        posts: [] 
      }),
      { 
        status: 200, // Return 200 with empty posts for graceful fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

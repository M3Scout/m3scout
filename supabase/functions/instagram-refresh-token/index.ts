import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current token from database
    const { data: tokenArr, error: tokenError } = await supabase
      .from('instagram_tokens')
      .select('id, access_token, expires_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    const tokenData = Array.isArray(tokenArr) ? tokenArr[0] ?? null : null;

    if (tokenError || !tokenData || tokenData.access_token === 'pending') {
      // Try environment variable
      const envToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
      if (!envToken) {
        return new Response(
          JSON.stringify({ success: false, error: 'No token available to refresh' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store env token first
      await supabase.from('instagram_tokens').upsert({
        id: tokenData?.id,
        access_token: envToken,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Token stored from environment variable' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentToken = tokenData.access_token;
    console.log('Attempting to refresh Instagram token...');

    // Refresh the long-lived token
    const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`;
    const response = await fetch(refreshUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Token refresh failed', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const newToken = data.access_token;
    const expiresIn = data.expires_in || 5184000; // Default 60 days in seconds

    // Update token in database
    const { error: updateError } = await supabase
      .from('instagram_tokens')
      .update({
        access_token: newToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
      })
      .eq('id', tokenData.id);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store refreshed token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresInDays = Math.floor(expiresIn / 86400);
    console.log(`Token refreshed successfully, expires in ${expiresInDays} days`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Token refreshed successfully`,
        expiresInDays,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error refreshing Instagram token:', errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

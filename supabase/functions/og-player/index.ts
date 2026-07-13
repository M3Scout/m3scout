// Edge function that returns pre-rendered HTML with proper Open Graph tags
// for athlete profile pages. Used by social crawlers (WhatsApp, Facebook,
// Twitter, LinkedIn, Slack, Telegram, Discord) which do NOT execute JS
// and therefore can't see the <Helmet> tags in the SPA.
//
// Usage: /functions/v1/og-player?slug=gustavo-ribeiro-de-oliveira
//
// The hosting layer rewrites /players/:slug -> this function when the
// incoming User-Agent matches a known social crawler.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SITE_URL = "https://m3agency.com.br";
const FALLBACK_IMAGE = `${SITE_URL}/og-default.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  const { title, description, image, url } = opts;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(image);
  const u = escapeHtml(url);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t}</title>
  <meta name="description" content="${d}" />
  <link rel="canonical" href="${u}" />

  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="M3 Agency" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:url" content="${u}" />
  <meta property="og:image" content="${i}" />
  <meta property="og:image:secure_url" content="${i}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="1200" />
  <meta property="og:image:alt" content="${t}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${i}" />

  <meta http-equiv="refresh" content="0; url=${u}" />
</head>
<body>
  <p>Redirecionando para <a href="${u}">${t}</a>…</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")?.trim();

    if (!slug) {
      return new Response("Missing slug", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: playerRow } = await supabase
      .from("public_players_safe" as any)
      .select("id, full_name, position, current_club, photo_url")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    const player = playerRow as {
      id: string;
      full_name: string;
      position: string | null;
      current_club: string | null;
      photo_url: string | null;
    } | null;

    const canonicalUrl = `${SITE_URL}/players/${slug}`;

    if (!player) {
      const html = renderHtml({
        title: "M3 Agency — Gestão de Atletas",
        description:
          "Agência especializada em scouting profissional, análise de desempenho e gestão de carreiras de atletas de futebol.",
        image: FALLBACK_IMAGE,
        url: canonicalUrl,
      });
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // Derive current club from most recent contract (matches PlayerProfile)
    let derivedClub = player.current_club;
    const { data: contracts } = await supabase
      .from("player_contract_history")
      .select("club_name")
      .eq("player_id", player.id)
      .eq("is_archived", false)
      .order("start_date", { ascending: false })
      .limit(1);
    if (contracts?.[0]?.club_name) derivedClub = contracts[0].club_name;

    const title = `M3 Agency — ${player.full_name}`;
    const descParts = [
      player.position,
      derivedClub,
      "Perfil oficial na M3 Agency",
    ].filter(Boolean) as string[];
    const description = descParts.join(" · ");

    const image = player.photo_url || FALLBACK_IMAGE;

    const html = renderHtml({ title, description, image, url: canonicalUrl });

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        // Cache 5 min at edge — crawler re-fetches will pick up updates quickly
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    console.error("og-player error:", err);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

// Migration 20260610043145 switched auto_rating / player_rating_history from
// the legacy 0-5 scale to the current 0-99 (FIFA-like) scale and backfilled
// every player with a fresh history row at that moment. Any row recorded
// before this instant is on the old 0-5 scale and must never be plotted or
// diffed against post-cutover 0-99 values — the two are not comparable and
// mixing them produces a fake "+46 point jump" that's really just a unit
// change, not real improvement.
export const RATING_SCALE_CUTOVER = "2026-06-10T04:31:45Z";

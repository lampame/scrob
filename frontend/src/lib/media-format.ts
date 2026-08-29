export function formatEpisodesLeft(
  episodesLeft?: number | null,
  remainingRuntime?: number | null,
): string | null {
  if (episodesLeft == null || episodesLeft <= 0) return null;
  const label = `${episodesLeft} episode${episodesLeft === 1 ? "" : "s"} left`;
  if (!remainingRuntime || remainingRuntime <= 0) return label;
  const h = Math.floor(remainingRuntime / 60);
  const m = remainingRuntime % 60;
  const runtime = h > 0 ? (m > 0 ? `~${h}h ${m}m` : `~${h}h`) : `~${m}m`;
  return `${label} · ${runtime}`;
}

export function formatSeasonTitle(seasonNumber: number, name?: string | null): string {
  const isSpecials = seasonNumber === 0;
  const fallback = isSpecials ? "Specials" : `Season ${seasonNumber}`;
  const trimDecorators = (value: string) => value.replace(/^[-–—:·\s]+|[-–—:·\s]+$/g, "").trim();
  // Strip a redundant leading label ("Season 3 - ", or "Specials - " for season 0)
  // so a name that only repeats the fallback collapses back to it.
  const prefixRe = isSpecials
    ? /^(?:season\s+0|specials)\s*[-–—:·]?\s*/i
    : new RegExp(`^season\\s+${seasonNumber}\\s*[-–—:·]?\\s*`, "i");
  const customName = trimDecorators(trimDecorators(name ?? "").replace(prefixRe, ""));
  return customName ? `${fallback} · ${customName}` : fallback;
}

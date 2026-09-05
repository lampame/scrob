// Counts aired, regular seasons for the "N Seasons" stat on a show's detail
// page. Deliberately narrower than what the season grid itself shows below
// it - Season 0 (Specials) stays browsable there (#335) and an unaired
// future season is still worth listing as "coming up" - this only decides
// what counts toward the number. See GitHub #360.
export interface CountableSeason {
  season_number: number;
  air_date?: string | null;
}

export function countAiredRegularSeasons(seasons: CountableSeason[]): number {
  const today = new Date();
  return seasons.filter((s) => {
    if (s.season_number <= 0) return false;
    // A season with no air_date on record is exactly the announced-but-
    // unscheduled case #360 reported (e.g. TMDB listing a season 4 with
    // episode_count: 0 and air_date: null well before it airs) - treat
    // missing the same as future, not as aired.
    if (!s.air_date) return false;
    return new Date(s.air_date + "T12:00:00") <= today;
  }).length;
}

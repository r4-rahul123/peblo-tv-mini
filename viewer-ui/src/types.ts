export interface PublishedEpisode {
  episode_number: number;
  title: string;
  duration_seconds: number;
  content_group: string;
  default_language?: string;
  available_languages: string[];
  thumbnail_url?: string;
  is_trailer?: boolean;
  variants?: Record<
    string,
    {
      language: string;
      title: string;
      synopsis?: string;
      video_url?: string;
      thumbnail_url?: string;
      duration_seconds: number;
    }
  >;
}

export interface PublishedSeason {
  season_number: number;
  title?: string;
  episodes: PublishedEpisode[];
}

export interface PublishedShow {
  id: string;
  title: string;
  synopsis?: string;
  section?: string;
  category?: string;
  target_age_group?: string;
  is_featured?: boolean;
  poster_url?: string;
  banner_url?: string;
  seasons: PublishedSeason[];
  trailers?: PublishedEpisode[];
  total_episodes?: number;
}

export interface SectionGroup {
  name?: string;
  section_name?: string;
  shows: PublishedShow[];
}

export interface PublishedCatalog {
  catalog_version?: string;
  published_at: string;
  published_by?: string;
  total_shows?: number;
  total_episodes?: number;
  sections: SectionGroup[];
  featured_shows: PublishedShow[];
}

export interface SearchFilterParams {
  query?: string;
  section?: string;
  category?: string;
  language?: string;
}

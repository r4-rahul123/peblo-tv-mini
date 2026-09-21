export interface PublishedEpisode {
  episode_number: number;
  title: string;
  duration_seconds: number;
  content_group: string;
  default_language: string;
  available_languages: string[];
  thumbnail_url: string;
  is_trailer?: boolean;
  variants?: Record<string, { language: string; title: string; synopsis?: string; video_url?: string; thumbnail_url?: string; duration_seconds: number }>;
}

export interface PublishedSeason {
  season_number: number;
  episodes: PublishedEpisode[];
}

export interface PublishedShow {
  id: string;
  title: string;
  synopsis: string;
  section: string;
  category: string;
  target_age_group: string;
  is_featured: boolean;
  poster_url: string;
  banner_url: string;
  seasons: PublishedSeason[];
  trailers?: PublishedEpisode[];
}

export interface SectionGroup {
  section_name: string;
  shows: PublishedShow[];
}

export interface PublishedCatalog {
  published_at: string;
  sections: SectionGroup[];
  featured_shows: PublishedShow[];
}

export interface SearchFilterParams {
  query?: string;
  section?: string;
  category?: string;
  language?: string;
}

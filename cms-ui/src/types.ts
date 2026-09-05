export interface Episode {
  id: string;
  season_id: string;
  episode_number: number;
  title: string;
  synopsis?: string;
  duration_seconds: number;
  content_group: string;
  language: string;
  video_url?: string;
  thumbnail_url?: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  show_id: string;
  season_number: number;
  title?: string;
  created_at: string;
  episodes: Episode[];
}

export interface Show {
  id: string;
  title: string;
  synopsis?: string;
  section?: string;
  category?: string;
  target_age_group?: string;
  is_featured: boolean;
  status: 'draft' | 'published';
  poster_url?: string;
  banner_url?: string;
  created_at: string;
  updated_at: string;
  seasons: Season[];
}

export interface ValidationIssue {
  entity_type: string;
  entity_id: string;
  entity_title: string;
  severity: 'BLOCKER' | 'WARNING';
  field: string;
  message: string;
  action_required: string;
}

export interface ValidationReport {
  is_publishable: boolean;
  total_blockers: number;
  total_warnings: number;
  published_shows_count: number;
  published_episodes_count: number;
  issues_by_show: Record<string, ValidationIssue[]>;
  general_issues: ValidationIssue[];
}

export interface PublishRun {
  run_id: string;
  triggered_by: string;
  status: string;
  shows_count: number;
  episodes_count: number;
  sections_count: number;
  catalogue_path?: string;
  error_message?: string;
  created_at: string;
}

export interface ArtworkUploadResponse {
  id: string;
  artwork_type: string;
  file_name: string;
  file_url: string;
  width: number;
  height: number;
  aspect_ratio: number;
  file_size_bytes: number;
}

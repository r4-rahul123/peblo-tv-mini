import React, { useState } from 'react';
import { PublishedShow } from '../types';
import { getMediaUrl, FALLBACK_BANNER, FALLBACK_THUMB } from '../api/client';
import { X, Play, Clock, Globe2, Film } from 'lucide-react';

interface ShowDetailModalProps {
  show: PublishedShow | null;
  onClose: () => void;
}

export const ShowDetailModal: React.FC<ShowDetailModalProps> = ({ show, onClose }) => {
  if (!show) return null;

  // Find regular seasons (season_number > 0)
  const regularSeasons = show.seasons?.filter((s) => s.season_number > 0) || [];
  // Trailers are stored in show.trailers or season_number === 0
  const trailers =
    show.trailers && show.trailers.length > 0
      ? show.trailers
      : show.seasons?.find((s) => s.season_number === 0)?.episodes || [];

  const [activeTab, setActiveTab] = useState<'episodes' | 'trailers'>('episodes');
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(
    regularSeasons[0]?.season_number || 1
  );

  // Active episodes for selected season
  const currentSeason = regularSeasons.find((s) => s.season_number === selectedSeasonNumber);
  const episodesToDisplay = currentSeason?.episodes || [];

  // Selected language state per episode (key: content_group, value: selected language)
  const [selectedLanguages, setSelectedLanguages] = useState<Record<string, string>>({});

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const headerBanner = getMediaUrl(show.banner_url || show.poster_url) || FALLBACK_BANNER;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-4xl bg-[#111726] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-6 max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-950/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-amber-500 hover:text-slate-950 flex items-center justify-center transition-all shadow-lg"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Header Banner */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-950">
            <img
              src={headerBanner}
              alt={show.title}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = FALLBACK_BANNER;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111726] via-[#111726]/40 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                  Ages {show.target_age_group}
                </span>
                <span className="bg-slate-900/90 text-slate-200 border border-slate-700 px-2.5 py-0.5 rounded-full">
                  {show.category}
                </span>
                <span className="bg-purple-950/80 text-purple-300 border border-purple-800 px-2.5 py-0.5 rounded-full">
                  {show.section}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {show.title}
              </h2>
            </div>
          </div>

          {/* Body content */}
          <div className="px-6 space-y-6">
            {/* Synopsis */}
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {show.synopsis || 'An exciting Indian animation adventure full of wonder, learning, and fun!'}
            </p>

            {/* Navigation Tabs (Episodes vs Trailers) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveTab('episodes')}
                  className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 ${
                    activeTab === 'episodes'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Episodes</span>
                </button>

                {trailers.length > 0 && (
                  <button
                    onClick={() => setActiveTab('trailers')}
                    className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors flex items-center space-x-2 ${
                      activeTab === 'trailers'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                        : 'text-slate-400 hover:text-white bg-slate-900'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>Trailers & Clips ({trailers.length})</span>
                  </button>
                )}
              </div>

              {/* Season Selector for Episodes */}
              {activeTab === 'episodes' && regularSeasons.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 font-semibold">Season:</span>
                  <select
                    value={selectedSeasonNumber}
                    onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                  >
                    {regularSeasons.map((s) => (
                      <option key={s.season_number} value={s.season_number}>
                        Season {s.season_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Episode List */}
            {activeTab === 'episodes' ? (
              <div className="space-y-3 pb-8">
                {episodesToDisplay.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No episodes available in this season.</p>
                ) : (
                  episodesToDisplay.map((ep) => {
                    const activeLang =
                      selectedLanguages[ep.content_group] || ep.default_language || ep.available_languages?.[0] || 'en';
                    const epThumbnail = getMediaUrl(ep.thumbnail_url) || FALLBACK_THUMB;

                    return (
                      <div
                        key={ep.content_group || ep.title}
                        className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group/ep"
                      >
                        {/* Thumbnail & Info */}
                        <div className="flex items-start sm:items-center space-x-4">
                          {/* 16:9 Thumbnail Slot */}
                          <div className="relative w-28 sm:w-36 aspect-video bg-slate-950 rounded-xl overflow-hidden shrink-0 border border-slate-800">
                            <img
                              src={epThumbnail}
                              alt={ep.title}
                              className="w-full h-full object-cover group-hover/ep:scale-105 transition-transform"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = FALLBACK_THUMB;
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ep:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>

                          {/* Episode Metadata */}
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-amber-400">
                                Ep {ep.episode_number}
                              </span>
                              <h4 className="text-sm font-bold text-slate-100 group-hover/ep:text-amber-400 transition-colors">
                                {ep.title}
                              </h4>
                            </div>

                            <div className="flex items-center space-x-2 text-xs text-slate-400">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{formatDuration(ep.duration_seconds)}</span>
                              </span>
                              <span>&bull;</span>
                              <span className="font-mono text-[10px] text-slate-500">
                                {ep.content_group}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Multi-Language Track Selector */}
                        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/60">
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1 font-semibold">
                            <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Audio:</span>
                          </span>

                          <div className="flex items-center space-x-1">
                            {(ep.available_languages && ep.available_languages.length > 0
                              ? ep.available_languages
                              : ['en']
                            ).map((lang) => {
                              const isSelected = activeLang === lang;
                              return (
                                <button
                                  key={lang}
                                  onClick={() =>
                                    setSelectedLanguages((prev) => ({
                                      ...prev,
                                      [ep.content_group]: lang,
                                    }))
                                  }
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase transition-all ${
                                    isSelected
                                      ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-400'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                                  }`}
                                >
                                  {lang}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Trailers & Extras List */
              <div className="space-y-3 pb-8">
                {trailers.map((trailer, idx) => {
                  const trailerThumb = getMediaUrl(trailer.thumbnail_url) || FALLBACK_THUMB;
                  return (
                    <div
                      key={trailer.content_group || idx}
                      className="bg-slate-900/80 border border-purple-900/40 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative w-28 sm:w-36 aspect-video bg-slate-950 rounded-xl overflow-hidden shrink-0 border border-purple-900/50">
                          <img
                            src={trailerThumb}
                            alt={trailer.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = FALLBACK_THUMB;
                            }}
                          />
                          <div className="absolute inset-0 bg-purple-950/40 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded font-bold">
                              Trailer
                            </span>
                            <h4 className="text-sm font-bold text-slate-100">{trailer.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>{formatDuration(trailer.duration_seconds)}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-xs font-semibold uppercase text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-800">
                        {trailer.default_language || 'hi'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

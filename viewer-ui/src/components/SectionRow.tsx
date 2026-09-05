import React, { useRef } from 'react';
import { PublishedShow } from '../types';
import { getMediaUrl, FALLBACK_POSTER } from '../api/client';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface SectionRowProps {
  title: string;
  shows: PublishedShow[];
  onSelectShow: (show: PublishedShow) => void;
}

export const SectionRow: React.FC<SectionRowProps> = ({ title, shows, onSelectShow }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const offset = direction === 'left' ? -400 : 400;
      rowRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  if (!shows || shows.length === 0) return null;

  return (
    <div className="space-y-3 relative group">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block" />
          <span>{title}</span>
        </h2>

        <span className="text-xs text-slate-400 font-medium">
          {shows.length} {shows.length === 1 ? 'Show' : 'Shows'}
        </span>
      </div>

      {/* Horizontal Scroll Area */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-amber-500 hover:text-slate-950"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={rowRef}
          className="flex space-x-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
        >
          {shows.map((show, index) => {
            const posterImg = getMediaUrl(show.poster_url) || FALLBACK_POSTER;
            const isRankedSection = title.toLowerCase().includes('top picks') || title.toLowerCase().includes('trending');

            return (
              <div
                key={show.id}
                onClick={() => onSelectShow(show)}
                className="flex-none w-40 sm:w-48 cursor-pointer group/card relative"
              >
                {/* 2:3 Aspect Ratio Card with solid fixed dimensions */}
                <div className="relative w-40 sm:w-48 h-60 sm:h-72 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-lg group-hover/card:border-amber-500/80 group-hover/card:shadow-xl group-hover/card:shadow-amber-500/20 group-hover/card:-translate-y-1 transition-all duration-300">
                  <img
                    src={posterImg}
                    alt={show.title}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = FALLBACK_POSTER;
                    }}
                  />

                  {/* Netflix-Style Top Rank Badge */}
                  {isRankedSection && (
                    <div className="absolute bottom-2 left-2 pointer-events-none">
                      <div className="flex items-center space-x-1 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-lg shadow-lg shadow-black/60">
                        <span>#{index + 1}</span>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold">Top</span>
                      </div>
                    </div>
                  )}

                  {/* Top Badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
                    <span className="text-[10px] font-extrabold bg-slate-950/80 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded backdrop-blur-md">
                      Ages {show.target_age_group}
                    </span>
                  </div>

                  {/* Hover Overlay Play Icon */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl transform scale-75 group-hover/card:scale-100 transition-transform">
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Meta info below card */}
                <div className="pt-2 px-1">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-100 truncate group-hover/card:text-amber-400 transition-colors">
                    {show.title}
                  </h3>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                    <span className="truncate">{show.category}</span>
                    <span>&bull;</span>
                    <span>{show.seasons?.length || 1} S</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-amber-500 hover:text-slate-950"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

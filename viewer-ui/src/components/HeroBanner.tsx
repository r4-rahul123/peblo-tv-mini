import React from 'react';
import { PublishedShow } from '../types';
import { getMediaUrl, FALLBACK_BANNER } from '../api/client';
import { Play, Info, Tag } from 'lucide-react';

interface HeroBannerProps {
  show?: PublishedShow | null;
  onSelectShow: (show: PublishedShow) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ show, onSelectShow }) => {
  if (!show) {
    return (
      <div className="relative w-full h-[460px] md:h-[540px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 flex items-center justify-center">
        <p className="text-slate-500 text-sm font-medium">Loading featured adventure...</p>
      </div>
    );
  }

  const bannerImage = getMediaUrl(show.banner_url || show.poster_url) || FALLBACK_BANNER;

  return (
    <div className="relative w-full h-[480px] md:h-[560px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group bg-slate-950">
      {/* Background Banner Image */}
      <img
        src={bannerImage}
        alt={show.title}
        className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null;
          target.src = FALLBACK_BANNER;
        }}
      />

      {/* Deep Vignette Gradient for Netflix-style text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/70 to-transparent" />

      {/* Content Container */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 max-w-2xl space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="bg-amber-500 text-slate-950 px-2.5 py-1 rounded-full shadow-lg shadow-amber-500/20 uppercase tracking-wider text-[11px] font-black">
            FEATURED ORIGINAL
          </span>

          <span className="bg-slate-800/90 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-full backdrop-blur-sm">
            Ages {show.target_age_group}
          </span>

          <span className="flex items-center space-x-1 bg-purple-950/70 text-purple-300 border border-purple-800 px-2.5 py-1 rounded-full backdrop-blur-sm">
            <Tag className="w-3 h-3" />
            <span>{show.category}</span>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">
          {show.title}
        </h1>

        {/* Synopsis */}
        <p className="text-xs md:text-sm text-slate-300 line-clamp-3 leading-relaxed drop-shadow">
          {show.synopsis || 'Discover magical adventures, moral teachings, and curiosity-fueling stories created specially for young Indian minds.'}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={() => onSelectShow(show)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-2xl text-sm flex items-center space-x-2.5 shadow-xl shadow-amber-500/25 transition-all transform active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Watch Now</span>
          </button>

          <button
            onClick={() => onSelectShow(show)}
            className="bg-slate-800/80 hover:bg-slate-700 text-white font-semibold px-5 py-3 rounded-2xl text-sm flex items-center space-x-2 border border-slate-700 backdrop-blur-sm transition-all"
          >
            <Info className="w-4 h-4" />
            <span>Episodes & Trailers</span>
          </button>
        </div>
      </div>
    </div>
  );
};

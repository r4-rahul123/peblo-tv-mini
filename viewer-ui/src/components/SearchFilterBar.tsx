import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import { SearchFilterParams } from '../types';

interface SearchFilterBarProps {
  filters: SearchFilterParams;
  onChange: (filters: SearchFilterParams) => void;
  availableSections: string[];
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  onChange,
  availableSections,
}) => {
  const categories = [
    'Moral Stories',
    'Science & Nature',
    'Mythology & Culture',
    'Adventure & Mystery',
    'Habits & Values',
    'Early Learning',
    'Animals & Wildlife',
  ];

  const languages = [
    { code: 'hi', label: 'Hindi (हिन्दी)' },
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'Tamil' },
    { code: 'te', label: 'Telugu' },
    { code: 'bn', label: 'Bengali' },
    { code: 'mr', label: 'Marathi' },
    { code: 'gu', label: 'Gujarati' },
  ];

  const hasActiveFilters =
    !!filters.query || !!filters.section || !!filters.category || !!filters.language;

  const handleReset = () => {
    onChange({ query: '', section: '', category: '', language: '' });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 md:p-5 space-y-4 shadow-xl backdrop-blur-md">
      {/* Top Search Input Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.query || ''}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Search shows, characters, themes (e.g. Moti, kindness, trees)..."
            className="w-full bg-[#0B0F19] border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {filters.query && (
            <button
              onClick={() => onChange({ ...filters, query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action reset if any filter active */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Dropdown Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/60">
        {/* Section Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
            <Filter className="w-3 h-3 text-amber-400" />
            <span>Section</span>
          </label>
          <select
            value={filters.section || ''}
            onChange={(e) => onChange({ ...filters, section: e.target.value })}
            className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Sections</option>
            {availableSections.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400">Category</label>
          <select
            value={filters.category || ''}
            onChange={(e) => onChange({ ...filters, category: e.target.value })}
            className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Language Dropdown */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-400">Audio Language</label>
          <select
            value={filters.language || ''}
            onChange={(e) => onChange({ ...filters, language: e.target.value })}
            className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Languages</option>
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

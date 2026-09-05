import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { getMediaUrl, FALLBACK_POSTER } from '../api/client';
import { PublishedCatalog, PublishedShow, SearchFilterParams } from '../types';
import { useViewerAuth } from '../context/ViewerAuthContext';
import { HeroBanner } from '../components/HeroBanner';
import { SectionRow } from '../components/SectionRow';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { ShowDetailModal } from '../components/ShowDetailModal';
import { Film, AlertCircle, RefreshCw } from 'lucide-react';

const isShowSuitableForAge = (showAgeGroup: string | undefined, userAgeGroup: string | undefined): boolean => {
  if (!userAgeGroup || userAgeGroup === 'All Ages') return true;
  if (!showAgeGroup) return true;

  const userAge = userAgeGroup.toLowerCase();
  const showAge = showAgeGroup.toLowerCase();

  // Toddlers (2-5)
  if (userAge.includes('2-5')) {
    return showAge.includes('2') || showAge.includes('3') || showAge.includes('4') || showAge.includes('2-5');
  }

  // Early Learning (4-8)
  if (userAge.includes('4-8')) {
    return showAge.includes('2-5') || showAge.includes('4-8') || showAge.includes('4') || showAge.includes('5') || showAge.includes('6');
  }

  // Older Kids (6-12)
  if (userAge.includes('6-12')) {
    return !showAge.includes('2-5'); // 6-12 sees moral stories, science, adventures
  }

  return true;
};

export const Home: React.FC = () => {
  const { activeProfile, user, openLoginModal, pendingShow } = useViewerAuth();
  const [selectedShow, setSelectedShow] = useState<PublishedShow | null>(null);
  const [filters, setFilters] = useState<SearchFilterParams>({
    query: '',
    section: '',
    category: '',
    language: '',
  });

  const handleSelectShow = (show: PublishedShow) => {
    if (!user) {
      openLoginModal(show);
    } else {
      setSelectedShow(show);
    }
  };

  useEffect(() => {
    if (user && pendingShow) {
      setSelectedShow(pendingShow);
    }
  }, [user, pendingShow]);

  // Fetch published catalogue
  const {
    data: catalog,
    isLoading,
    isError,
    refetch,
  } = useQuery<PublishedCatalog>({
    queryKey: ['publishedCatalog'],
    queryFn: async () => {
      const res = await api.get('/catalog');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Extract all unique section names for filter dropdown
  const availableSections = useMemo(() => {
    if (!catalog?.sections) return [];
    return catalog.sections.map((s: any) => s.section_name || s.name);
  }, [catalog]);

  // Featured show for Hero Banner adapted to profile age
  const featuredShow = useMemo(() => {
    if (!catalog) return null;
    const candidates =
      catalog.featured_shows && catalog.featured_shows.length > 0
        ? catalog.featured_shows
        : catalog.sections?.[0]?.shows || [];

    const ageMatched = candidates.find((show: any) =>
      isShowSuitableForAge(show.target_age_group, activeProfile?.ageGroup)
    );
    return ageMatched || candidates[0] || null;
  }, [catalog, activeProfile]);

  // Check if filtering is active
  const isFiltering =
    !!filters.query?.trim() || !!filters.section || !!filters.category || !!filters.language;

  // Filtered shows across all sections when filter is active
  const filteredShows = useMemo(() => {
    if (!catalog?.sections || !isFiltering) return [];

    const allShowsMap = new Map<string, PublishedShow>();
    catalog.sections.forEach((sec) => {
      sec.shows.forEach((show) => {
        allShowsMap.set(show.id, show);
      });
    });

    return Array.from(allShowsMap.values()).filter((show) => {
      // Query filter
      if (filters.query?.trim()) {
        const q = filters.query.toLowerCase().trim();
        const matchTitle = show.title.toLowerCase().includes(q);
        const matchSynopsis = show.synopsis?.toLowerCase().includes(q);
        const matchEpisodes = show.seasons?.some((s) =>
          s.episodes.some((ep) => ep.title.toLowerCase().includes(q))
        );
        if (!matchTitle && !matchSynopsis && !matchEpisodes) return false;
      }

      // Section filter
      if (filters.section && show.section !== filters.section) {
        return false;
      }

      // Category filter
      if (filters.category && show.category !== filters.category) {
        return false;
      }

      // Language filter
      if (filters.language) {
        const hasLang = show.seasons?.some((s) =>
          s.episodes?.some(
            (ep) =>
              ep.default_language === filters.language ||
              ep.available_languages?.includes(filters.language!)
          )
        );
        if (!hasLang) return false;
      }

      return true;
    });
  }, [catalog, filters, isFiltering]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Opening Peblo TV universe...</p>
      </div>
    );
  }

  if (isError || !catalog) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Catalogue Initializing</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          The catalogue is being generated or hasn't been published yet. You can publish it from the CMS Studio or retry.
        </p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Catalogue</span>
        </button>
      </div>
    );
  }

  // Dynamic age-filtered sections based on active profile
  const displaySections = useMemo(() => {
    if (!catalog?.sections) return [];
    if (!activeProfile || activeProfile.ageGroup === 'All Ages') return catalog.sections;

    return catalog.sections
      .map((section: any) => ({
        ...section,
        shows: (section.shows || []).filter((show: PublishedShow) =>
          isShowSuitableForAge(show.target_age_group, activeProfile.ageGroup)
        ),
      }))
      .filter((section: any) => section.shows && section.shows.length > 0);
  }, [catalog, activeProfile]);

  return (
    <div className="space-y-10 pb-20">
      {/* Featured Top Hero Banner (Shown when not actively searching) */}
      {!isFiltering && (
        <section>
          <HeroBanner show={featuredShow} onSelectShow={handleSelectShow} />
        </section>
      )}

      {/* Multi-Criteria Search & Filter Bar */}
      <section>
        <SearchFilterBar
          filters={filters}
          onChange={setFilters}
          availableSections={availableSections}
        />
      </section>

      {/* Main Content Area */}
      {isFiltering ? (
        /* Search / Filter Results Grid */
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Search Results</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredShows.length} found)
              </span>
            </h2>
          </div>

          {filteredShows.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Film className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No matching shows found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching for different keywords, categories, or clearing selected filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredShows.map((show) => {
                const posterUrl = getMediaUrl(show.poster_url) || FALLBACK_POSTER;
                return (
                  <div
                    key={show.id}
                    onClick={() => handleSelectShow(show)}
                    className="cursor-pointer group/card transition-transform duration-300 hover:-translate-y-1.5"
                  >
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md group-hover/card:border-amber-500 group-hover/card:shadow-amber-500/20">
                      <img
                        src={posterUrl}
                        alt={show.title}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = FALLBACK_POSTER;
                        }}
                      />
                    </div>
                    <div className="pt-2 px-1">
                      <h4 className="font-bold text-xs text-slate-200 truncate group-hover/card:text-amber-400">
                        {show.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{show.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* Standard Categorized Horizontal Section Rails */
        <section className="space-y-8">
          {activeProfile && activeProfile.ageGroup !== 'All Ages' && (
            <div className="flex items-center justify-between bg-slate-900/80 border border-amber-500/20 rounded-2xl px-4 py-2.5 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Browsing personalized for <strong className="text-amber-400 font-bold">{activeProfile.name}</strong> ({activeProfile.ageGroup === '2-5' ? 'Ages 2-5 • Toddler & Rhymes' : activeProfile.ageGroup === '4-8' ? 'Ages 4-8 • Stories & Learning' : 'Ages 6-12 • Adventures & Science'})
                </span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Age Filter Active
              </span>
            </div>
          )}

          {displaySections.map((section: any) => (
            <SectionRow
              key={section.section_name || section.name}
              title={section.section_name || section.name}
              shows={section.shows}
              onSelectShow={handleSelectShow}
            />
          ))}
        </section>
      )}

      {/* Show Detail Modal */}
      <ShowDetailModal show={selectedShow} onClose={() => setSelectedShow(null)} />
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { Show } from '../types';
import { Plus, Search, Layers, Film, Edit3 } from 'lucide-react';

interface ShowListProps {
  onSelectShow: (show: Show) => void;
  onCreateShow: () => void;
}

export const ShowList: React.FC<ShowListProps> = ({ onSelectShow, onCreateShow }) => {
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: shows = [], isLoading, isError } = useQuery<Show[]>({
    queryKey: ['shows', search, sectionFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get('/shows/', {
        params: {
          q: search || undefined,
          section: sectionFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-white tracking-tight'>Catalogue Shows</h1>
          <p className='text-sm text-slate-400'>Manage Indian animated series, moral fables, and episodes</p>
        </div>
        <button
          onClick={onCreateShow}
          className='bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center space-x-2 shadow-lg shadow-orange-500/20 hover:from-amber-400 hover:to-orange-400 transition-all'
        >
          <Plus className='w-4 h-4' />
          <span>New Show</span>
        </button>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800'>
        <div className='relative'>
          <Search className='w-4 h-4 text-slate-400 absolute left-3 top-2.5' />
          <input
            type='text'
            placeholder='Search shows or synopsis...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500'
          />
        </div>

        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className='bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500'
        >
          <option value=''>All Sections</option>
          <option value='Top Picks for You'>Top Picks for You</option>
          <option value='Trending Indian Animated Stories'>Trending Indian Animated Stories</option>
          <option value='Peblo Originals & Adventures'>Peblo Originals & Adventures</option>
          <option value='Learn, Discover & Grow'>Learn, Discover & Grow</option>
          <option value='Bedtime Stories & Calm Down'>Bedtime Stories & Calm Down</option>
          <option value='Fun Rhymes & Sing Along'>Fun Rhymes & Sing Along</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className='bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500'
        >
          <option value=''>All Statuses</option>
          <option value='published'>Published</option>
          <option value='draft'>Draft</option>
        </select>
      </div>

      {isLoading ? (
        <div className='py-20 text-center text-slate-500'>Loading shows...</div>
      ) : isError ? (
        <div className='p-8 text-center bg-red-950/20 border border-red-900 rounded-xl text-red-300'>Failed to load shows.</div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {shows.map((show) => {
            const totalEpisodes = show.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;
            return (
              <div key={show.id} className='bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between group shadow-lg'>
                <div>
                  <div className='relative h-36 bg-slate-950 overflow-hidden'>
                    {show.banner_url ? (
                      <img src={show.banner_url} alt={show.title} className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300' />
                    ) : show.poster_url ? (
                      <img src={show.poster_url} alt={show.title} className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300' />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center bg-slate-950 text-slate-600'><Film className='w-8 h-8' /></div>
                    )}
                    <div className='absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent' />
                    <div className='absolute top-3 right-3'>
                      <span className={'text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-sm ' + (show.status === 'published' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80' : 'bg-amber-950/80 text-amber-300 border-amber-700/80')}>
                        {show.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className='p-4 space-y-2'>
                    <h3 className='font-bold text-base text-white line-clamp-1'>{show.title}</h3>
                    <p className='text-xs text-slate-400 line-clamp-2 leading-relaxed'>{show.synopsis || 'No synopsis provided.'}</p>
                    <div className='pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60'>
                      <span className='flex items-center space-x-1'><Layers className='w-3.5 h-3.5 text-amber-500' /><span>{show.seasons?.length || 0} Seasons</span></span>
                      <span>{totalEpisodes} Episodes</span>
                      <span className='bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300'>{show.category || 'General'}</span>
                    </div>
                  </div>
                </div>

                <div className='p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end space-x-2'>
                  <button onClick={() => onSelectShow(show)} className='px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5'>
                    <Edit3 className='w-3.5 h-3.5' />
                    <span>Edit Show & Episodes</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

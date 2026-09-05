import React, { useState } from 'react';
import { Show } from '../types';
import { ArtworkUploadSlot } from '../components/ArtworkUploadSlot';
import api, { getMediaUrl } from '../api/client';
import { ArrowLeft, Save, Plus, AlertCircle, Trash2 } from 'lucide-react';

interface ShowFormProps {
  show?: Show | null;
  onBack: () => void;
  onSaved: () => void;
}

export const ShowForm: React.FC<ShowFormProps> = ({ show, onBack, onSaved }) => {
  const isEditing = !!show?.id;

  const [title, setTitle] = useState(show?.title || '');
  const [synopsis, setSynopsis] = useState(show?.synopsis || '');
  const [section, setSection] = useState(show?.section || 'Top Picks for You');
  const [category, setCategory] = useState(show?.category || 'Moral Stories');
  const [targetAgeGroup, setTargetAgeGroup] = useState(show?.target_age_group || '4-8');
  const [isFeatured, setIsFeatured] = useState(show?.is_featured || false);
  const [status, setStatus] = useState(show?.status || 'draft');
  const [posterUrl, setPosterUrl] = useState(show?.poster_url || '');
  const [bannerUrl, setBannerUrl] = useState(show?.banner_url || '');

  const [isAddingEpisode, setIsAddingEpisode] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [newEpTitle, setNewEpTitle] = useState('');
  const [newEpDuration, setNewEpDuration] = useState<number>(300);
  const [newEpContentGroup, setNewEpContentGroup] = useState('');
  const [newEpLanguage, setNewEpLanguage] = useState('en');
  const [newEpThumbUrl, setNewEpThumbUrl] = useState('');
  const [newEpStatus, setNewEpStatus] = useState('published');
  const [epError, setEpError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveShow = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const payload = {
        title,
        synopsis,
        section,
        category,
        target_age_group: targetAgeGroup,
        is_featured: isFeatured,
        status,
        poster_url: posterUrl || null,
        banner_url: bannerUrl || null,
      };

      if (isEditing) {
        await api.put('/shows/' + show.id, payload);
      } else {
        await api.post('/shows/', payload);
      }
      onSaved();
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Failed to save show.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEpisode = async () => {
    if (!selectedSeasonId) return;
    setEpError(null);
    try {
      await api.post('/episodes/season/' + selectedSeasonId, {
        episode_number: 1,
        title: newEpTitle,
        duration_seconds: Number(newEpDuration),
        content_group: newEpContentGroup,
        language: newEpLanguage,
        thumbnail_url: newEpThumbUrl || null,
        status: newEpStatus,
      });
      setIsAddingEpisode(false);
      onSaved();
    } catch (err: any) {
      setEpError(err.response?.data?.detail || 'Failed to add episode. Check for duplicate content_group and language.');
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (window.confirm('Delete this episode track from the show?')) {
      try {
        await api.delete('/episodes/' + episodeId);
        onSaved();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Failed to delete episode track.');
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white flex items-center space-x-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalogue</span>
        </button>

        <button
          onClick={handleSaveShow}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm flex items-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : isEditing ? 'Update Show' : 'Create Show'}</span>
        </button>
      </div>

      {saveError && (
        <div className="bg-red-950/60 border border-red-800 rounded-xl p-3 text-red-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">Show Metadata</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">Show Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Moti's Many Lives"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">Synopsis</label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Child-friendly synopsis describing themes, characters, and adventures..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Catalogue Section *</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="Top Picks for You">Top Picks for You</option>
              <option value="Trending Indian Animated Stories">Trending Indian Animated Stories</option>
              <option value="Peblo Originals & Adventures">Peblo Originals & Adventures</option>
              <option value="Learn, Discover & Grow">Learn, Discover & Grow</option>
              <option value="Bedtime Stories & Calm Down">Bedtime Stories & Calm Down</option>
              <option value="Fun Rhymes & Sing Along">Fun Rhymes & Sing Along</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="Moral Stories">Moral Stories</option>
              <option value="Science & Nature">Science & Nature</option>
              <option value="Mythology & Culture">Mythology & Culture</option>
              <option value="Adventure & Mystery">Adventure & Mystery</option>
              <option value="Habits & Values">Habits & Values</option>
              <option value="Early Learning">Early Learning</option>
              <option value="Animals & Wildlife">Animals & Wildlife</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Age Group *</label>
            <select
              value={targetAgeGroup}
              onChange={(e) => setTargetAgeGroup(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="2-5">Ages 2-5 (Toddlers & Rhymes)</option>
              <option value="2-6">Ages 2-6 (Toddlers & Bedtime)</option>
              <option value="4-8">Ages 4-8 (Early Learning & Stories)</option>
              <option value="5-10">Ages 5-10 (Science & Discovery)</option>
              <option value="5-11">Ages 5-11 (Wildlife & Adventures)</option>
              <option value="6-12">Ages 6-12 (Mythology & Advanced Learning)</option>
              <option value="All Ages">All Ages (Family)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Publication Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="draft">Draft (Hidden from Catalogue)</option>
              <option value="published">Published (Live in Catalogue)</option>
            </select>
          </div>

          <div className="space-y-1.5 flex items-center pt-5">
            <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800 focus:ring-amber-500"
              />
              <span>Feature in Top Hero Banner</span>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Show Artwork Slots</h2>
          <p className="text-xs text-slate-400">Strictly enforced dimensions and max 200KB limit per reference specifications.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ArtworkUploadSlot
            label="Show Poster (Portrait)"
            artworkType="poster"
            expectedSpecs="2:3 aspect ratio (~600x900px), max 200 KB"
            currentUrl={posterUrl}
            onUploadSuccess={(url) => setPosterUrl(url)}
          />

          <ArtworkUploadSlot
            label="Featured Hero Banner"
            artworkType="banner"
            expectedSpecs="16:9 aspect ratio (~1280x720px), max 200 KB"
            currentUrl={bannerUrl}
            onUploadSuccess={(url) => setBannerUrl(url)}
          />
        </div>
      </div>

      {isEditing && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Seasons & Episode Tracks</h2>
              <p className="text-xs text-slate-400">Language variants sharing a <code className="text-amber-400 font-mono">content_group</code> collapse into one entry.</p>
            </div>
          </div>

          <div className="space-y-6">
            {show.seasons?.map((season) => (
              <div key={season.id} className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-200">
                      {season.season_number === 0 ? 'Season 0 — Trailers & Clips' : 'Season ' + season.season_number}
                    </span>
                    {season.season_number === 0 && (
                      <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                        Trailers Only
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSeasonId(season.id);
                      setIsAddingEpisode(true);
                    }}
                    className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-400 px-3 py-1 rounded-lg border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Episode</span>
                  </button>
                </div>

                {season.episodes?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">No episodes added yet.</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {season.episodes?.map((ep) => (
                      <div key={ep.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          {ep.thumbnail_url ? (
                            <img
                              src={getMediaUrl(ep.thumbnail_url)}
                              alt={ep.title}
                              className="w-12 h-7 object-cover rounded border border-slate-800"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                              }}
                            />
                          ) : (
                            <div className="w-12 h-7 bg-slate-900 border border-red-900/50 rounded flex items-center justify-center text-[9px] text-red-400">
                              No Thumb
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-slate-200">{ep.title}</span>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                              <span className="font-mono text-amber-400/80">group: {ep.content_group}</span>
                              <span>&bull;</span>
                              <span className="uppercase font-bold text-slate-300">{ep.language}</span>
                              <span>&bull;</span>
                              <span>{ep.duration_seconds > 0 ? ep.duration_seconds + 's' : <strong className="text-red-400">0s (Blocker)</strong>}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={'text-[10px] px-2 py-0.5 rounded font-semibold border ' + (ep.status === 'published' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-slate-900 text-slate-400 border-slate-800')}>
                            {ep.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEpisode(ep.id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                            title="Delete this episode track"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isAddingEpisode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-white">Add New Episode</h3>
            
            {epError && (
              <div className="p-2.5 bg-red-950 border border-red-800 rounded-lg text-xs text-red-200">
                {epError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Episode Title *</label>
                <input
                  type="text"
                  value={newEpTitle}
                  onChange={(e) => setNewEpTitle(e.target.value)}
                  placeholder="e.g. The Whispering Tree"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Content Group ID *</label>
                  <input
                    type="text"
                    value={newEpContentGroup}
                    onChange={(e) => setNewEpContentGroup(e.target.value)}
                    placeholder="e.g. cg-moti-s1-e1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Language *</label>
                  <select
                    value={newEpLanguage}
                    onChange={(e) => setNewEpLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100"
                  >
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                    <option value="ta">Tamil (ta)</option>
                    <option value="te">Telugu (te)</option>
                    <option value="bn">Bengali (bn)</option>
                    <option value="mr">Marathi (mr)</option>
                    <option value="gu">Gujarati (gu)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Duration (seconds) *</label>
                <input
                  type="number"
                  value={newEpDuration}
                  onChange={(e) => setNewEpDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              <ArtworkUploadSlot
                label="Episode Thumbnail (16:9)"
                artworkType="thumbnail"
                expectedSpecs="16:9 aspect ratio (~640x360px), max 200 KB"
                currentUrl={newEpThumbUrl}
                onUploadSuccess={(url) => setNewEpThumbUrl(url)}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddingEpisode(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEpisode}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold"
              >
                Add Episode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

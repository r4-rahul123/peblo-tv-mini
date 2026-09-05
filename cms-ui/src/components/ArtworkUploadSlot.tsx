import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import api, { getMediaUrl, getStoredRole } from '../api/client';

interface ArtworkUploadSlotProps {
  label: string;
  artworkType: 'poster' | 'banner' | 'thumbnail';
  expectedSpecs: string;
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
}

export const ArtworkUploadSlot: React.FC<ArtworkUploadSlotProps> = ({
  label,
  artworkType,
  expectedSpecs,
  currentUrl,
  onUploadSuccess,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('artwork_type', artworkType);
    formData.append('file', file);

    try {
      const response = await api.post('/artwork/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-User-Role': getStoredRole(),
        },
      });
      const uploadedUrl = response.data.file_url;
      setPreviewUrl(uploadedUrl);
      setSuccessMessage('Valid ' + artworkType + ' uploaded (' + (file.size / 1024).toFixed(1) + ' KB)');
      onUploadSuccess(uploadedUrl);
    } catch (err: any) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'object' && detail.errors) {
          setErrorMessage(detail.errors.join(' '));
        } else if (typeof detail === 'string') {
          setErrorMessage(detail);
        } else {
          setErrorMessage('Artwork rejected: Dimension, ratio or 200KB limit violated.');
        }
      } else {
        setErrorMessage('Failed to connect to artwork validation server.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className='bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between'>
      <div>
        <div className='flex items-center justify-between mb-1'>
          <label className='text-sm font-semibold text-slate-200'>{label}</label>
          <span className='text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40'>
            {artworkType.toUpperCase()}
          </span>
        </div>
        <p className='text-xs text-slate-400 mb-3'>{expectedSpecs}</p>
      </div>

      <div className='space-y-3'>
        <div className='relative border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-950/50 rounded-lg flex flex-col items-center justify-center p-3 text-center transition-colors min-h-[110px]'>
          {uploading ? (
            <div className='flex flex-col items-center space-y-2 py-4'>
              <Loader2 className='w-6 h-6 text-amber-500 animate-spin' />
              <span className='text-xs text-slate-300'>Validating dimensions & size...</span>
            </div>
          ) : previewUrl ? (
            <div className='relative group w-full flex flex-col items-center'>
              <img
                src={getMediaUrl(previewUrl)}
                alt={label}
                className='max-h-28 rounded object-contain shadow-md border border-slate-800'
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                }}
              />
              <span className='text-[10px] text-emerald-400 mt-1 flex items-center space-x-1'>
                <CheckCircle2 className='w-3 h-3 inline' /> <span>Valid Spec Confirmed</span>
              </span>
            </div>
          ) : (
            <div className='flex flex-col items-center space-y-1 py-2 text-slate-400'>
              <ImageIcon className='w-7 h-7 text-slate-500 mb-1' />
              <span className='text-xs font-medium text-slate-300'>Click or drag image here</span>
              <span className='text-[10px] text-slate-500'>JPG or PNG (&le; 200 KB)</span>
            </div>
          )}
          <input type='file' accept='image/jpeg,image/png' onChange={handleFileChange} disabled={uploading} className='absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed' />
        </div>

        {errorMessage && (
          <div className='bg-red-950/60 border border-red-800/80 rounded-lg p-2.5 text-xs text-red-200 flex items-start space-x-2'>
            <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
            <div className='space-y-0.5'>
              <strong className='font-semibold block text-red-300'>Rejected by spec validation:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {successMessage && !errorMessage && (
          <div className='bg-emerald-950/50 border border-emerald-800/50 rounded-lg p-2 text-xs text-emerald-300 flex items-center space-x-1.5'>
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400 shrink-0' />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface AvatarStyle {
  background: string;
  textColor: string;
  className: string;
}

export const getProfileAvatarStyle = (avatarColor?: string, index: number = 0): AvatarStyle => {
  const colorStr = (avatarColor || '').toLowerCase();

  // Explicit color string checks
  if (colorStr.includes('purple') || colorStr.includes('pink') || colorStr.includes('violet')) {
    return {
      background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      textColor: '#ffffff',
      className: 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white',
    };
  }

  if (colorStr.includes('emerald') || colorStr.includes('teal') || colorStr.includes('green')) {
    return {
      background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
      textColor: '#ffffff',
      className: 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white',
    };
  }

  if (colorStr.includes('blue') || colorStr.includes('cyan') || colorStr.includes('indigo')) {
    return {
      background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
      textColor: '#ffffff',
      className: 'bg-gradient-to-tr from-blue-600 to-cyan-400 text-white',
    };
  }

  if (colorStr.includes('amber') || colorStr.includes('orange') || colorStr.includes('yellow')) {
    return {
      background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
      textColor: '#0f172a',
      className: 'bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950',
    };
  }

  // Positional index palette fallback (if avatarColor is empty or unrecognized)
  const defaultPalette: AvatarStyle[] = [
    {
      background: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
      textColor: '#0f172a',
      className: 'bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950',
    },
    {
      background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      textColor: '#ffffff',
      className: 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white',
    },
    {
      background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
      textColor: '#ffffff',
      className: 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white',
    },
    {
      background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
      textColor: '#ffffff',
      className: 'bg-gradient-to-tr from-blue-600 to-cyan-400 text-white',
    },
  ];

  return defaultPalette[Math.abs(index) % defaultPalette.length];
};

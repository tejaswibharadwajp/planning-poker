import { useEffect, useState } from 'react';
import { FIBONACCI_CARDS, DeckType } from '../types';
import clsx from 'clsx';

interface Props {
  selectedVote: string | null;
  onVote: (vote: string) => void;
  disabled?: boolean;
  cards?: string[];
  deckType?: DeckType;
}

const CARD_GRADIENT: Record<string, string> = {
  '0':   'from-slate-400 to-slate-600',
  '½':   'from-sky-400 to-cyan-600',
  '1':   'from-blue-400 to-blue-600',
  '2':   'from-indigo-400 to-indigo-700',
  '3':   'from-violet-500 to-violet-700',
  '4':   'from-purple-400 to-purple-600',
  '5':   'from-purple-500 to-purple-700',
  '8':   'from-fuchsia-500 to-pink-700',
  '13':  'from-rose-500 to-rose-700',
  '16':  'from-rose-600 to-red-700',
  '21':  'from-red-500 to-red-700',
  '32':  'from-orange-500 to-orange-700',
  '40':  'from-orange-500 to-red-600',
  '64':  'from-orange-600 to-red-700',
  '100': 'from-red-600 to-rose-900',
  '?':   'from-amber-400 to-amber-600',
  '☕':  'from-amber-700 to-stone-800',
};

const CARD_ACCENT: Record<string, string> = {
  '0':   'text-slate-500 hover:border-slate-400 hover:shadow-slate-100',
  '½':   'text-sky-500 hover:border-sky-400 hover:shadow-sky-100',
  '1':   'text-blue-500 hover:border-blue-400 hover:shadow-blue-100',
  '2':   'text-indigo-500 hover:border-indigo-400 hover:shadow-indigo-100',
  '3':   'text-violet-600 hover:border-violet-400 hover:shadow-violet-100',
  '4':   'text-purple-500 hover:border-purple-400 hover:shadow-purple-100',
  '5':   'text-purple-600 hover:border-purple-400 hover:shadow-purple-100',
  '8':   'text-fuchsia-600 hover:border-fuchsia-400 hover:shadow-fuchsia-100',
  '13':  'text-rose-500 hover:border-rose-400 hover:shadow-rose-100',
  '16':  'text-rose-600 hover:border-rose-500 hover:shadow-rose-100',
  '21':  'text-red-500 hover:border-red-400 hover:shadow-red-100',
  '32':  'text-orange-600 hover:border-orange-500 hover:shadow-orange-100',
  '40':  'text-orange-500 hover:border-orange-400 hover:shadow-orange-100',
  '64':  'text-orange-700 hover:border-orange-600 hover:shadow-orange-100',
  '100': 'text-red-600 hover:border-red-500 hover:shadow-red-100',
  '?':   'text-amber-500 hover:border-amber-400 hover:shadow-amber-100',
  '☕':  'text-amber-700 hover:border-amber-600 hover:shadow-amber-100',
};

interface TshirtColor {
  gradStart: string;
  gradEnd: string;
  light: string;
  text: string;
  glow: string;
}

const TSHIRT_COLORS: Record<string, TshirtColor> = {
  'XS':  { gradStart: '#38bdf8', gradEnd: '#0891b2', light: '#e0f2fe', text: '#0284c7', glow: 'drop-shadow(0 0 14px rgba(14,165,233,0.85))' },
  'S':   { gradStart: '#60a5fa', gradEnd: '#2563eb', light: '#dbeafe', text: '#1d4ed8', glow: 'drop-shadow(0 0 14px rgba(59,130,246,0.85))' },
  'M':   { gradStart: '#818cf8', gradEnd: '#4338ca', light: '#e0e7ff', text: '#4338ca', glow: 'drop-shadow(0 0 14px rgba(99,102,241,0.85))' },
  'L':   { gradStart: '#a78bfa', gradEnd: '#6d28d9', light: '#ede9fe', text: '#6d28d9', glow: 'drop-shadow(0 0 14px rgba(139,92,246,0.85))' },
  'XL':  { gradStart: '#e879f9', gradEnd: '#db2777', light: '#fae8ff', text: '#c026d3', glow: 'drop-shadow(0 0 14px rgba(217,70,239,0.85))' },
  'XXL': { gradStart: '#fb7185', gradEnd: '#be123c', light: '#ffe4e6', text: '#e11d48', glow: 'drop-shadow(0 0 14px rgba(244,63,94,0.85))' },
  '?':   { gradStart: '#fbbf24', gradEnd: '#d97706', light: '#fef3c7', text: '#b45309', glow: 'drop-shadow(0 0 14px rgba(245,158,11,0.85))' },
};

// SVG path for a proper t-shirt silhouette with bezier curves.
// ViewBox 0 0 100 110. Collar is a smooth U-neck; armholes are curved.
const TSHIRT_PATH =
  'M12,2 L0,38 Q16,42 24,44 L24,108 L76,108 L76,44 Q84,42 100,38 L88,2 Q74,1 68,12 Q60,24 50,24 Q40,24 32,12 Q26,1 12,2 Z';

export default function VotingCards({
  selectedVote,
  onVote,
  disabled,
  cards = FIBONACCI_CARDS,
  deckType,
}: Props) {
  const [localVote, setLocalVote] = useState<string | null>(selectedVote);

  // Server masks in-progress votes as '?' — skip that to keep optimistic highlight.
  // Only sync when server resets (null) or reveals the real value.
  useEffect(() => {
    if (selectedVote !== '?') setLocalVote(selectedVote);
  }, [selectedVote]);

  const isTshirt = deckType === 'tshirt';

  const handleVote = (card: string) => {
    if (disabled) return;
    setLocalVote(card);
    onVote(card);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
        Select your estimate
      </p>

      <div className={clsx('flex flex-wrap justify-center items-end', isTshirt ? 'gap-5' : 'gap-3')}>
        {cards.map((card) => {
          const isSelected = localVote === card;

          /* ── T-shirt card ── */
          if (isTshirt) {
            const colors = TSHIRT_COLORS[card] ?? TSHIRT_COLORS['M'];
            const gradId = `tsg-${card.replace('?', 'q')}`;

            return (
              <button
                key={card}
                onClick={() => handleVote(card)}
                disabled={disabled}
                style={{
                  filter: isSelected ? colors.glow : undefined,
                  background: 'none',
                }}
                className={clsx(
                  'relative w-[4.5rem] h-[5.5rem] transition-all duration-200 select-none',
                  'flex items-center justify-center pt-5',
                  isSelected
                    ? 'scale-[1.22] -translate-y-3'
                    : [
                        'hover:scale-110 hover:-translate-y-1',
                        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                      ]
                )}
              >
                {/* SVG t-shirt shape */}
                <svg
                  viewBox="0 0 100 110"
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute inset-0 w-full h-full"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.gradStart} />
                      <stop offset="100%" stopColor={colors.gradEnd} />
                    </linearGradient>
                  </defs>
                  <path
                    d={TSHIRT_PATH}
                    fill={isSelected ? `url(#${gradId})` : colors.light}
                  />
                </svg>

                {/* Label */}
                <span
                  className="relative z-10 text-sm font-black leading-none tracking-tight"
                  style={{ color: isSelected ? '#fff' : colors.text }}
                >
                  {card}
                </span>
              </button>
            );
          }

          /* ── Regular poker card ── */
          const gradient = CARD_GRADIENT[card] || 'from-indigo-500 to-indigo-700';
          const accent = CARD_ACCENT[card] || 'text-indigo-500 hover:border-indigo-400';

          return (
            <button
              key={card}
              onClick={() => handleVote(card)}
              disabled={disabled}
              className={clsx(
                'relative w-14 h-[4.75rem] rounded-xl font-extrabold transition-all duration-200 select-none overflow-hidden',
                'flex flex-col items-center justify-center',
                'border-2',
                isSelected
                  ? [
                      `bg-gradient-to-b ${gradient}`,
                      'border-white/20 text-white',
                      'scale-[1.15] -translate-y-2.5',
                      'shadow-xl ring-2 ring-offset-2 ring-indigo-400',
                    ]
                  : [
                      `bg-white border-slate-200 ${accent}`,
                      'hover:scale-105 hover:-translate-y-1 hover:shadow-lg',
                      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ]
              )}
            >
              <span className={clsx('absolute top-1.5 left-2 text-[9px] font-bold leading-none tabular-nums', isSelected ? 'text-white/60' : 'opacity-40')}>
                {card}
              </span>
              <span aria-hidden className={clsx('absolute -bottom-1 text-[2.5rem] leading-none pointer-events-none select-none', isSelected ? 'text-white/10' : 'text-slate-100')}>
                ♠
              </span>
              <span className="relative z-10 text-xl leading-none">{card}</span>
              <span className={clsx('absolute bottom-1.5 right-2 text-[9px] font-bold leading-none rotate-180 tabular-nums', isSelected ? 'text-white/60' : 'opacity-40')}>
                {card}
              </span>
            </button>
          );
        })}
      </div>

      {localVote ? (
        <p className="text-center text-sm font-semibold text-indigo-600">
          You picked{' '}
          <span className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg font-mono tracking-wide">
            {localVote}
          </span>
          {' · '}
          <span className="text-slate-400 font-normal">click another to change</span>
        </p>
      ) : (
        <p className="text-center text-sm text-slate-400">Tap a card to vote</p>
      )}
    </div>
  );
}

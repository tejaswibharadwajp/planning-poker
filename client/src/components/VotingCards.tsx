import { FIBONACCI_CARDS } from '../types';
import clsx from 'clsx';

interface Props {
  selectedVote: string | null;
  onVote: (vote: string) => void;
  disabled?: boolean;
  hasVoted?: boolean;
}

const CARD_GRADIENT: Record<string, string> = {
  '0':   'from-slate-400 to-slate-600',
  '½':   'from-sky-400 to-cyan-600',
  '1':   'from-blue-400 to-blue-600',
  '2':   'from-indigo-400 to-indigo-700',
  '3':   'from-violet-500 to-violet-700',
  '5':   'from-purple-500 to-purple-700',
  '8':   'from-fuchsia-500 to-pink-700',
  '13':  'from-rose-500 to-rose-700',
  '21':  'from-red-500 to-red-700',
  '40':  'from-orange-500 to-red-600',
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
  '5':   'text-purple-600 hover:border-purple-400 hover:shadow-purple-100',
  '8':   'text-fuchsia-600 hover:border-fuchsia-400 hover:shadow-fuchsia-100',
  '13':  'text-rose-500 hover:border-rose-400 hover:shadow-rose-100',
  '21':  'text-red-500 hover:border-red-400 hover:shadow-red-100',
  '40':  'text-orange-500 hover:border-orange-400 hover:shadow-orange-100',
  '100': 'text-red-600 hover:border-red-500 hover:shadow-red-100',
  '?':   'text-amber-500 hover:border-amber-400 hover:shadow-amber-100',
  '☕':  'text-amber-700 hover:border-amber-600 hover:shadow-amber-100',
};

export default function VotingCards({ selectedVote, onVote, disabled, hasVoted }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
        Select your estimate
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        {FIBONACCI_CARDS.map((card) => {
          const isSelected = selectedVote === card;
          const gradient = CARD_GRADIENT[card] || 'from-indigo-500 to-indigo-700';
          const accent = CARD_ACCENT[card] || 'text-indigo-500 hover:border-indigo-400';

          return (
            <button
              key={card}
              onClick={() => !disabled && onVote(card)}
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
                      'shadow-xl',
                      'ring-2 ring-offset-2 ring-indigo-400',
                    ]
                  : hasVoted
                  ? [
                      'bg-white border-slate-100 text-slate-400',
                      'opacity-30 scale-95',
                      'hover:opacity-55 hover:scale-100 hover:border-slate-300',
                      'cursor-pointer',
                    ]
                  : [
                      `bg-white border-slate-200 ${accent}`,
                      'hover:scale-105 hover:-translate-y-1 hover:shadow-lg',
                      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ]
              )}
            >
              {/* Top-left pip */}
              <span
                className={clsx(
                  'absolute top-1.5 left-2 text-[9px] font-bold leading-none tabular-nums',
                  isSelected ? 'text-white/60' : 'opacity-40'
                )}
              >
                {card}
              </span>

              {/* Suit watermark */}
              <span
                aria-hidden
                className={clsx(
                  'absolute -bottom-1 text-[2.5rem] leading-none pointer-events-none select-none',
                  isSelected ? 'text-white/10' : 'text-slate-100'
                )}
              >
                ♠
              </span>

              {/* Main value */}
              <span className="relative z-10 text-xl leading-none">
                {card}
              </span>

              {/* Bottom-right pip */}
              <span
                className={clsx(
                  'absolute bottom-1.5 right-2 text-[9px] font-bold leading-none rotate-180 tabular-nums',
                  isSelected ? 'text-white/60' : 'opacity-40'
                )}
              >
                {card}
              </span>
            </button>
          );
        })}
      </div>

      {selectedVote ? (
        <p className="text-center text-sm font-semibold text-indigo-600">
          You picked{' '}
          <span className="inline-block bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg font-mono tracking-wide">
            {selectedVote}
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

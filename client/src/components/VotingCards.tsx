import { FIBONACCI_CARDS } from '../types';
import clsx from 'clsx';

interface Props {
  selectedVote: string | null;
  onVote: (vote: string) => void;
  disabled?: boolean;
}

const CARD_COLORS: Record<string, string> = {
  '0': 'from-slate-500 to-slate-600',
  '½': 'from-slate-400 to-slate-500',
  '1': 'from-blue-500 to-blue-600',
  '2': 'from-blue-500 to-indigo-600',
  '3': 'from-indigo-500 to-indigo-600',
  '5': 'from-violet-500 to-purple-600',
  '8': 'from-purple-500 to-purple-700',
  '13': 'from-fuchsia-500 to-pink-600',
  '21': 'from-rose-500 to-red-600',
  '40': 'from-orange-500 to-red-600',
  '100': 'from-red-600 to-red-800',
  '?': 'from-amber-400 to-amber-600',
  '☕': 'from-amber-700 to-amber-900',
};

export default function VotingCards({ selectedVote, onVote, disabled }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
        Select your estimate
      </p>
      <div className="flex flex-wrap gap-2.5 justify-center">
        {FIBONACCI_CARDS.map((card) => {
          const isSelected = selectedVote === card;
          const gradient = CARD_COLORS[card] || 'from-indigo-500 to-indigo-600';

          return (
            <button
              key={card}
              onClick={() => !disabled && onVote(card)}
              disabled={disabled}
              className={clsx(
                'relative w-14 h-20 rounded-xl font-bold text-lg transition-all duration-150 select-none',
                'flex flex-col items-center justify-center',
                'border-2 shadow-md',
                isSelected
                  ? [
                      `bg-gradient-to-b ${gradient}`,
                      'border-transparent text-white',
                      'shadow-lg scale-110 -translate-y-1',
                      'ring-2 ring-offset-2 ring-indigo-400',
                    ]
                  : [
                      'bg-white border-slate-200 text-slate-700',
                      'hover:border-indigo-300 hover:shadow-indigo-100',
                      'hover:scale-105 hover:-translate-y-0.5 hover:text-indigo-700',
                      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ]
              )}
            >
              {/* Card corner pip top-left */}
              <span
                className={clsx(
                  'absolute top-1.5 left-2 text-xs font-bold leading-none',
                  isSelected ? 'text-white/70' : 'text-slate-300'
                )}
              >
                {card === '☕' ? '☕' : card}
              </span>

              {/* Main value */}
              <span className="text-xl leading-none">{card}</span>

              {/* Card corner pip bottom-right */}
              <span
                className={clsx(
                  'absolute bottom-1.5 right-2 text-xs font-bold leading-none rotate-180',
                  isSelected ? 'text-white/70' : 'text-slate-300'
                )}
              >
                {card === '☕' ? '☕' : card}
              </span>
            </button>
          );
        })}
      </div>
      {selectedVote && (
        <p className="text-center text-sm text-indigo-600 font-semibold animate-fade-in">
          You voted <span className="bg-indigo-100 px-2 py-0.5 rounded-lg">{selectedVote}</span> · Click another card to change
        </p>
      )}
    </div>
  );
}

import { useState } from 'react';
import { RotateCcw, CheckCircle, TrendingUp, TrendingDown, Sparkles, MessageCircle } from 'lucide-react';
import { Story, FIBONACCI_CARDS } from '../types';
import clsx from 'clsx';

interface Props {
  story: Story;
  isAdmin: boolean;
  onRevote: () => void;
  onSetEstimate: (estimate: string) => void;
  cards?: string[];
}

function makeCardIndex(cards: string[]) {
  const numericCards = cards.filter((c) => !isNaN(parseFloat(c)));
  const numericValues = numericCards.map((c) => (c === '½' ? 0.5 : parseFloat(c)));
  return { numericCards, numericValues };
}

function cardIndex(v: number, numericValues: number[]): number {
  let closest = 0;
  let minDist = Infinity;
  numericValues.forEach((fv, i) => {
    const d = Math.abs(fv - v);
    if (d < minDist) { minDist = d; closest = i; }
  });
  return closest;
}

function parseVote(v: string): number | null {
  if (v === '½') return 0.5;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export default function VoteResults({ story, isAdmin, onRevote, onSetEstimate, cards = FIBONACCI_CARDS }: Props) {
  const [customEstimate, setCustomEstimate] = useState('');

  const { numericCards, numericValues } = makeCardIndex(cards);
  const fi = (v: number) => cardIndex(v, numericValues);

  const votes = Object.values(story.votes);
  const numericVotes = votes
    .map((v) => parseVote(v.vote))
    .filter((v): v is number => v !== null);

  const avg =
    numericVotes.length > 0
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : null;

  const minVote = numericVotes.length > 0 ? Math.min(...numericVotes) : null;
  const maxVote = numericVotes.length > 0 ? Math.max(...numericVotes) : null;

  // Vote distribution
  const distribution: Record<string, string[]> = {};
  votes.forEach(({ vote, userName }) => {
    if (!distribution[vote]) distribution[vote] = [];
    distribution[vote].push(userName);
  });

  const sortedDistribution = Object.entries(distribution).sort(([a], [b]) => {
    const ia = cards.indexOf(a);
    const ib = cards.indexOf(b);
    return ia - ib;
  });

  const maxCount = Math.max(...Object.values(distribution).map((v) => v.length), 1);
  const isConsensus = Object.keys(distribution).length === 1 && votes.length > 0;

  // Divergence detection
  const minIdx = minVote !== null ? fi(minVote) : 0;
  const maxIdx = maxVote !== null ? fi(maxVote) : 0;
  const spread = maxIdx - minIdx;
  const hasDivergence = !isConsensus && numericVotes.length >= 2 && spread >= 2;

  const skeptics = hasDivergence
    ? votes.filter((v) => {
        const n = parseVote(v.vote);
        return n !== null && fi(n) <= minIdx + 1;
      })
    : [];
  const optimists = hasDivergence
    ? votes.filter((v) => {
        const n = parseVote(v.vote);
        return n !== null && fi(n) >= maxIdx - 1;
      })
    : [];

  // Suggested estimate: nearest numeric card to average
  const suggested =
    avg !== null && numericCards.length > 0
      ? numericCards.reduce((closest, card) => {
          const diff = Math.abs(parseFloat(card) - avg);
          const closestDiff = Math.abs(parseFloat(closest) - avg);
          return diff < closestDiff ? card : closest;
        })
      : null;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Consensus banner */}
      {isConsensus && votes.length >= 2 && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Team consensus!</p>
            <p className="text-xs text-emerald-600">Everyone voted the same — great alignment.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      {numericVotes.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Lowest', value: minVote !== null ? String(minVote) : '—', cls: 'bg-blue-50 border-blue-100 text-blue-700 text-blue-500' },
            { label: 'Highest', value: maxVote !== null ? String(maxVote) : '—', cls: 'bg-rose-50 border-rose-100 text-rose-700 text-rose-500' },
          ].map(({ label, value, cls }) => {
            const [bg, border, textVal, textLabel] = cls.split(' ');
            return (
            <div key={label} className={`${bg} border ${border} rounded-xl px-4 py-3 text-center`}>
              <p className={`text-2xl font-bold ${textVal} mb-0.5`}>{value}</p>
              <p className={`text-xs ${textLabel} font-medium`}>{label}</p>
            </div>
          )})}
        </div>
      )}

      {/* Divergence panel */}
      {hasDivergence && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-200 bg-amber-100/60">
            <MessageCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">Wide range detected — discussion needed</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-amber-200">
            {/* Skeptics */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Voted Low</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {skeptics.map(({ userName, vote }) => (
                  <span
                    key={userName}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-lg"
                  >
                    {userName.split(' ')[0]}
                    <span className="bg-blue-200 px-1 rounded font-mono">{vote}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-blue-600 italic">Ask: why did you vote low?</p>
            </div>
            {/* Optimists */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">Voted High</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {optimists.map(({ userName, vote }) => (
                  <span
                    key={userName}
                    className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs font-semibold px-2 py-1 rounded-lg"
                  >
                    {userName.split(' ')[0]}
                    <span className="bg-rose-200 px-1 rounded font-mono">{vote}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-rose-600 italic">Ask: why did you vote high?</p>
            </div>
          </div>
        </div>
      )}

      {/* Distribution */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Vote distribution
        </p>
        <div className="space-y-2">
          {sortedDistribution.map(([vote, voters]) => (
            <div key={vote} className="flex items-start gap-3">
              <div className="w-10 flex-shrink-0 text-right pt-1.5">
                <span className="text-sm font-bold text-slate-700">{vote}</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-lg transition-all duration-700',
                        voters.length === maxCount ? 'bg-indigo-500' : 'bg-indigo-200'
                      )}
                      style={{ width: `${(voters.length / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="flex-shrink-0 text-xs text-slate-500 w-14 text-right">
                    {voters.length} vote{voters.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap pl-0">
                  {voters.map((name) => {
                    const vNum = parseVote(vote);
                    const isLow = hasDivergence && vNum !== null && fi(vNum) <= minIdx + 1;
                    const isHigh = hasDivergence && vNum !== null && fi(vNum) >= maxIdx - 1;
                    return (
                      <span
                        key={name}
                        className={clsx(
                          'text-xs px-1.5 py-0.5 rounded-md font-medium',
                          isLow ? 'bg-blue-100 text-blue-700' :
                          isHigh ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-600'
                        )}
                        title={name}
                      >
                        {name.split(' ')[0]}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {votes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No votes submitted</p>
          )}
        </div>
      </div>

      {/* Set estimate (admin only) */}
      {isAdmin && story.status === 'revealed' && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Set final estimate</p>

          {suggested && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Suggested:</span>
              {[suggested].concat(
                cards.filter(
                  (c) => c !== suggested && c !== '?' && c !== '☕'
                ).slice(0, 4)
              ).map((card) => (
                <button
                  key={card}
                  onClick={() => onSetEstimate(card)}
                  className={clsx(
                    'w-10 h-12 rounded-xl border-2 font-bold text-sm transition-all hover:scale-105',
                    card === suggested
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  )}
                >
                  {card}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={customEstimate}
              onChange={(e) => setCustomEstimate(e.target.value)}
              placeholder="Custom estimate…"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customEstimate.trim()) {
                  onSetEstimate(customEstimate.trim());
                  setCustomEstimate('');
                }
              }}
            />
            <button
              onClick={() => { if (customEstimate.trim()) { onSetEstimate(customEstimate.trim()); setCustomEstimate(''); } }}
              disabled={!customEstimate.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Set
            </button>
          </div>

          <button
            onClick={onRevote}
            className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revote
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { RotateCcw, CheckCircle, TrendingUp, Sparkles } from 'lucide-react';
import { Story, FIBONACCI_CARDS } from '../types';
import clsx from 'clsx';

interface Props {
  story: Story;
  isAdmin: boolean;
  onRevote: () => void;
  onSetEstimate: (estimate: string) => void;
}

const NUMERIC_CARDS = FIBONACCI_CARDS.filter((c) => !isNaN(parseFloat(c)) && c !== '?');

function parseVote(v: string): number | null {
  if (v === '½') return 0.5;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export default function VoteResults({ story, isAdmin, onRevote, onSetEstimate }: Props) {
  const [customEstimate, setCustomEstimate] = useState('');

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
    const ia = FIBONACCI_CARDS.indexOf(a);
    const ib = FIBONACCI_CARDS.indexOf(b);
    return ia - ib;
  });

  const maxCount = Math.max(...Object.values(distribution).map((v) => v.length), 1);
  const isConsensus = Object.keys(distribution).length === 1 && votes.length > 0;

  // Suggested estimate: nearest Fibonacci to average
  const suggested =
    avg !== null
      ? NUMERIC_CARDS.reduce((closest, card) => {
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Average', value: avg !== null ? avg.toFixed(1) : '—', cls: 'bg-indigo-50 border-indigo-100 text-indigo-700 text-indigo-500' },
            { label: 'Min', value: minVote !== null ? String(minVote) : '—', cls: 'bg-blue-50 border-blue-100 text-blue-700 text-blue-500' },
            { label: 'Max', value: maxVote !== null ? String(maxVote) : '—', cls: 'bg-rose-50 border-rose-100 text-rose-700 text-rose-500' },
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
                  {voters.map((name) => (
                    <span
                      key={name}
                      className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium"
                      title={name}
                    >
                      {name.split(' ')[0]}
                    </span>
                  ))}
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
                FIBONACCI_CARDS.filter(
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
                }
              }}
            />
            <button
              onClick={() => customEstimate.trim() && onSetEstimate(customEstimate.trim())}
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

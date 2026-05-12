import { useState } from 'react';
import { X, Star, Loader2, CheckCircle2 } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface Props {
  onClose: () => void;
  defaultName?: string;
}

export default function FeedbackModal({ onClose, defaultName = '' }: Props) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState('');
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, quote, rating }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="flex flex-col items-center text-center p-10 gap-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            <h3 className="text-xl font-bold text-slate-800">Thanks for the feedback!</h3>
            <p className="text-slate-500 text-sm">We review all submissions before displaying them.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Share your experience</h3>
              <p className="text-slate-500 text-sm mt-1">Help others discover Sprint Planner.</p>
            </div>

            {/* Star rating */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Rating</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                maxLength={64}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Role <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Engineering Lead at Acme"
                maxLength={64}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your feedback</label>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="What did you love about Sprint Planner?"
                maxLength={500}
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm resize-none"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{quote.length}/500</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !quote.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Submitting…' : 'Submit feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

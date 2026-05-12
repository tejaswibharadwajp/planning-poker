import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, ArrowRight, Loader2, AlertCircle, Zap,
  BarChart2, Shield, LogOut, Download, GitMerge, Eye, Star, MessageSquarePlus,
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useUser, useClerk, SignInButton } from '@clerk/clerk-react';
import { DeckType, DECK_LABELS } from '../types';
import FeedbackModal from '../components/FeedbackModal';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  quote: string;
  rating: number;
  created_at: string;
}

const CARD_VALUES = ['1', '2', '3', '5', '8', '13'];
const CARD_COLORS = [
  'from-indigo-500 to-indigo-700',
  'from-violet-500 to-violet-700',
  'from-blue-500 to-blue-700',
  'from-indigo-600 to-purple-700',
  'from-slate-600 to-slate-800',
  'from-purple-500 to-indigo-700',
];

function PokerCardPreview() {
  return (
    <div className="relative h-40 flex items-center justify-center">
      {CARD_VALUES.map((val, i) => {
        const angle = (i - 2.5) * 10;
        const tx = (i - 2.5) * 18;
        return (
          <div
            key={val}
            className={`absolute w-16 h-24 rounded-xl bg-gradient-to-br ${CARD_COLORS[i]} shadow-xl flex flex-col items-center justify-center border border-white/20`}
            style={{
              transform: `rotate(${angle}deg) translateX(${tx}px)`,
              zIndex: i,
            }}
          >
            <span className="text-white font-bold text-2xl leading-none">{val}</span>
            <span className="text-white/50 text-xs mt-1">♠</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { joinRoom, error, room, clearError } = useSocket();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isSpectator, setIsSpectator] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deckType, setDeckType] = useState<DeckType>('fibonacci');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (user && !userName) {
      setUserName(
        user.fullName || user.firstName ||
        user.emailAddresses[0]?.emailAddress?.split('@')[0] || ''
      );
    }
  }, [user]);

  useEffect(() => {
    if (room) navigate(`/room/${room.code}`);
  }, [room, navigate]);

  useEffect(() => {
    if (error) setLoading(false);
  }, [error]);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/testimonials`)
      .then((r) => r.json())
      .then((d) => setTestimonials(d.testimonials || []))
      .catch(() => {});
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setLoading(true);
    clearError();
    joinRoom({ userName: userName.trim(), roomName: roomName.trim() || undefined, deckType });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !roomCode.trim()) return;
    setLoading(true);
    clearError();
    joinRoom({ userName: userName.trim(), roomCode: roomCode.trim().toUpperCase(), isSpectator });
  };

  const features = [
    { icon: Zap, label: 'Real-time sync', desc: 'Every vote updates instantly for all participants' },
    { icon: BarChart2, label: 'Vote analytics', desc: 'Consensus detection and divergence highlighting' },
    { icon: GitMerge, label: 'ADO & Jira import', desc: 'Pull sprint work items directly from your board' },
    { icon: Download, label: 'Export CSV', desc: 'Download estimates when the session ends' },
    { icon: Eye, label: 'Spectator mode', desc: 'PMs and stakeholders can watch without voting' },
    { icon: Shield, label: 'Facilitator controls', desc: 'Kick, mute, reveal, and manage your session' },
  ];

  const steps = [
    { n: '1', title: 'Create a room', desc: 'Name your session, share the 6-character code or invite link with your team.' },
    { n: '2', title: 'Add your stories', desc: 'Type them in, paste Jira/Linear URLs, or import directly from Azure DevOps.' },
    { n: '3', title: 'Vote & reveal', desc: 'Everyone picks a card, facilitator reveals, divergence is flagged automatically.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col">

      {/* ── Nav ── */}
      <nav className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <span className="text-white font-bold text-lg">♠</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Sprint Planner</span>
        </div>

        <div className="flex items-center gap-3">
          {isLoaded && (
            user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  {user.imageUrl && (
                    <img src={user.imageUrl} className="w-7 h-7 rounded-full" alt="" />
                  )}
                  <span className="text-slate-300 text-sm font-medium">
                    {user.firstName || user.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </>
            ) : (
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all">
                  Sign in
                </button>
              </SignInButton>
            )
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-4 pt-16 pb-10">
        <div className="inline-flex items-center gap-2 bg-indigo-500/15 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-indigo-500/25">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Free · No account required · Real-time
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight max-w-4xl">
          Planning poker<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">
            built for dev teams
          </span>
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Fibonacci voting, live consensus detection, Jira & Azure DevOps integration — everything your sprint planning needs, nothing it doesn't.
        </p>

        <PokerCardPreview />

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
          {[
            { value: '100%', label: 'Free to use' },
            { value: '<1s', label: 'Vote sync latency' },
            { value: 'ADO + Jira', label: 'Integrations' },
            { value: 'No signup', label: 'to get started' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main grid: form + features ── */}
      <section className="px-4 sm:px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden order-1 lg:order-2">
            {/* Sign-in nudge for guests */}
            {isLoaded && !user && (
              <div className="px-6 pt-5 pb-0">
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-indigo-800">Sign in for session history</p>
                    <p className="text-xs text-indigo-500 mt-0.5">Google · GitHub · Microsoft — one click</p>
                  </div>
                  <SignInButton mode="modal">
                    <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap ml-3">
                      Sign in →
                    </button>
                  </SignInButton>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-100 mt-4">
              <button
                onClick={() => setTab('create')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all ${
                  tab === 'create'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Create a Room
              </button>
              <button
                onClick={() => setTab('join')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all ${
                  tab === 'join'
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                Join a Room
              </button>
            </div>

            <div className="p-6 sm:p-8">
              {error && (
                <div className="flex items-center gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {tab === 'create' ? (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Sarah Johnson"
                      maxLength={32}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Room name <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g. Q2 Sprint 4 Planning"
                      maxLength={64}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Card deck</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(DECK_LABELS) as DeckType[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDeckType(key)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                            deckType === key
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {DECK_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !userName.trim()}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {loading ? 'Creating room…' : 'Create Room'}
                  </button>
                  <p className="text-center text-xs text-slate-400">
                    You'll be the facilitator. Share the code with your team.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Your name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Alex Chen"
                      maxLength={32}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Room code</label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="ABCD12"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm uppercase tracking-widest font-mono text-center text-lg"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="relative flex-shrink-0">
                      <input type="checkbox" checked={isSpectator} onChange={(e) => setIsSpectator(e.target.checked)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${isSpectator ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSpectator ? 'translate-x-4' : ''}`} />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-700">Join as spectator</span>
                      <p className="text-xs text-slate-400">Watch without voting — for PMs, stakeholders</p>
                    </div>
                  </label>
                  <button
                    type="submit"
                    disabled={loading || !userName.trim() || !roomCode.trim()}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {loading ? 'Joining…' : 'Join Room'}
                  </button>
                  <p className="text-center text-xs text-slate-400">
                    Ask your facilitator for the 6-character room code.
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="order-2 lg:order-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold mb-0.5">{label}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-4 py-12 max-w-4xl mx-auto w-full">
        <h2 className="text-center text-2xl font-bold text-white mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="relative text-center p-6 rounded-2xl bg-white/5 border border-white/8">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                {n}
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      {testimonials.length > 0 && (
        <section className="px-4 py-12 max-w-5xl mx-auto w-full">
          <h2 className="text-center text-2xl font-bold text-white mb-2">What teams are saying</h2>
          <p className="text-center text-slate-500 text-sm mb-10">Real feedback from real sprint teams.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.id} className="p-5 rounded-2xl bg-white/5 border border-white/8 flex flex-col gap-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${s <= t.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
                    />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div>
                  <p className="text-white text-sm font-semibold">{t.name}</p>
                  {t.role && <p className="text-slate-500 text-xs mt-0.5">{t.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Floating feedback pill ── */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all duration-150"
      >
        <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
        Feedback
      </button>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-600 text-xs">
        <span>Sprint Planner · Real-time Planning Poker</span>
        <span>Free forever · No account required</span>
      </footer>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          defaultName={user?.fullName || user?.firstName || ''}
        />
      )}
    </div>
  );
}

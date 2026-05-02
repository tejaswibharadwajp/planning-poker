import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, AlertCircle, Zap, Users, BarChart2, Shield } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

export default function Home() {
  const navigate = useNavigate();
  const { joinRoom, error, room, clearError } = useSocket();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isSpectator, setIsSpectator] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (room) navigate(`/room/${room.code}`);
  }, [room, navigate]);

  useEffect(() => {
    if (error) setLoading(false);
  }, [error]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setLoading(true);
    clearError();
    joinRoom({ userName: userName.trim(), roomName: roomName.trim() || undefined });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !roomCode.trim()) return;
    setLoading(true);
    clearError();
    joinRoom({ userName: userName.trim(), roomCode: roomCode.trim().toUpperCase(), isSpectator });
  };

  const features = [
    { icon: Zap, label: 'Real-time sync', desc: 'Every vote updates instantly across all participants' },
    { icon: Users, label: 'Team rooms', desc: 'Shareable room codes — no accounts needed' },
    { icon: BarChart2, label: 'Vote analytics', desc: 'Visualize consensus and divergence at a glance' },
    { icon: Shield, label: 'Admin controls', desc: 'Facilitator controls reveals and story management' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-lg">♠</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Sprint Planner</span>
        </div>
        <div className="text-slate-400 text-sm">
          Planning Poker for agile teams
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-6xl">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-indigo-500/15 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full mb-6 border border-indigo-500/25 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live · No account required
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 leading-tight tracking-tight">
              Estimate stories<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                together, in real time.
              </span>
            </h1>
            <p className="text-slate-400 text-xl max-w-2xl mx-auto">
              Run your sprint planning sessions with confidence. Fibonacci voting, live updates, and analytics — all in one room.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Features */}
            <div className="lg:col-span-2 grid grid-cols-1 gap-4">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold mb-0.5">{label}</div>
                    <div className="text-slate-400 text-sm leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Form card */}
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setTab('create')}
                  className={`flex-1 py-4 text-sm font-semibold transition-all ${
                    tab === 'create'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Create a Room
                </button>
                <button
                  onClick={() => setTab('join')}
                  className={`flex-1 py-4 text-sm font-semibold transition-all ${
                    tab === 'join'
                      ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Join a Room
                </button>
              </div>

              <div className="p-8">
                {error && (
                  <div className="flex items-center gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {tab === 'create' ? (
                  <form onSubmit={handleCreate} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Your name
                      </label>
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
                        Room name{' '}
                        <span className="text-slate-400 font-normal">(optional)</span>
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
                    <button
                      type="submit"
                      disabled={loading || !userName.trim()}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {loading ? 'Creating room…' : 'Create Room'}
                    </button>
                    <p className="text-center text-xs text-slate-400">
                      You'll be the facilitator. Share the room code with your team.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleJoin} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Your name
                      </label>
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
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Room code
                      </label>
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCD12"
                        maxLength={6}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm uppercase tracking-widest font-mono"
                        required
                      />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer select-none group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isSpectator}
                          onChange={(e) => setIsSpectator(e.target.checked)}
                          className="sr-only"
                        />
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
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4" />
                      )}
                      {loading ? 'Joining…' : 'Join Room'}
                    </button>
                    <p className="text-center text-xs text-slate-400">
                      Ask your facilitator for the 6-character room code.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-slate-600 text-xs">
        Sprint Planner · Real-time Planning Poker
      </footer>
    </div>
  );
}

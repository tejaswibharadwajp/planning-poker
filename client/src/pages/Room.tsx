import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Copy,
  Check,
  LogOut,
  Wifi,
  WifiOff,
  Eye,
  Play,
  Users,
  BookOpen,
  Zap,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import StoryPanel from '../components/StoryPanel';
import VotingCards from '../components/VotingCards';
import ParticipantsPanel from '../components/ParticipantsPanel';
import VoteResults from '../components/VoteResults';
import clsx from 'clsx';

export default function Room() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const {
    room,
    userId,
    connected,
    error,
    clearError,
    joinRoom,
    addStory,
    deleteStory,
    selectStory,
    submitVote,
    revealVotes,
    resetVotes,
    setEstimate,
    promoteUser,
    leaveRoom,
    startQuickVote,
  } = useSocket();

  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<'backlog' | 'voting' | 'team'>('voting');

  // Direct URL join state
  const [joinName, setJoinName] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Capture at mount — true only if prior confirmed session (has userId)
  const [hasValidSession] = useState(() => {
    try {
      const s = sessionStorage.getItem('poker_session');
      return s ? !!JSON.parse(s)?.userId : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (room || error) setJoinLoading(false);
  }, [room, error]);

  if (!room && hasValidSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Reconnecting to room…</p>
        </div>
      </div>
    );
  }

  if (!room && !hasValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <span className="text-white font-bold text-2xl">♠</span>
            </div>
            <h1 className="text-white font-bold text-2xl mb-1">Join Room</h1>
            <p className="text-slate-400 text-sm">
              You've been invited to room{' '}
              <span className="font-mono font-bold text-indigo-300 tracking-widest">{code}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-7">
            {error && (
              <div className="flex items-center gap-2.5 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!joinName.trim() || !code) return;
                setJoinLoading(true);
                clearError();
                joinRoom({ userName: joinName.trim(), roomCode: code });
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Your name
                </label>
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  maxLength={32}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 placeholder-slate-400 text-sm"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={joinLoading || !joinName.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-indigo-500/25"
              >
                {joinLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {joinLoading ? 'Joining…' : 'Join Room'}
              </button>
            </form>
          </div>

          <p className="text-center text-slate-600 text-xs mt-5">
            Wrong room?{' '}
            <button
              onClick={() => navigate('/')}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Go home
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (!room) return null;

  const currentUser = room.users.find((u) => u.id === userId) ?? null;
  const isAdmin = currentUser?.isAdmin ?? false;
  const activeStory = room.stories.find((s) => s.id === room.activeStoryId) ?? null;
  const myVote = currentUser?.vote ?? null;
  const hasVoted = currentUser?.hasVoted ?? false;

  const votingPhase = activeStory?.status === 'voting';
  const revealedPhase = activeStory?.status === 'revealed';
  const connectedUsers = room.users.filter((u) => u.isConnected);
  const votedCount = connectedUsers.filter((u) => u.hasVoted).length;
  const allVoted = connectedUsers.length > 0 && votedCount === connectedUsers.length;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* ── Header ── */}
      <header className="h-14 bg-slate-900 flex items-center px-4 gap-4 flex-shrink-0 border-b border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <span className="text-white font-bold text-sm">♠</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">Sprint Planner</span>
        </div>

        {/* Room name */}
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-semibold text-sm truncate">{room.name}</h1>
        </div>

        {/* Room code */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors group"
        >
          <span className="text-slate-400 text-xs">Code:</span>
          <span className="text-white font-mono font-bold text-sm tracking-widest">{room.code}</span>
          {codeCopied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          )}
        </button>

        {/* Share link */}
        <button
          onClick={copyLink}
          title="Copy invite link"
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium group"
        >
          {linkCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 hidden sm:block">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              <span className="text-slate-400 group-hover:text-white transition-colors hidden sm:block">Share</span>
            </>
          )}
        </button>

        {/* Connection status */}
        <div className={clsx('flex items-center gap-1.5 text-xs font-medium', connected ? 'text-emerald-400' : 'text-red-400')}>
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:block">{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Users count */}
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Users className="w-3.5 h-3.5" />
          <span>{connectedUsers.length}</span>
        </div>

        {/* Leave */}
        <button
          onClick={handleLeave}
          className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-xs font-medium transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Leave</span>
        </button>
      </header>

      {/* ── Mobile tab bar ── */}
      <div className="lg:hidden flex border-b border-slate-200 bg-white">
        {(
          [
            { key: 'backlog', label: 'Backlog', icon: BookOpen },
            { key: 'voting', label: 'Voting', icon: Play },
            { key: 'team', label: 'Team', icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2',
              mobileTab === key
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Story panel */}
        <div
          className={clsx(
            'w-72 flex-shrink-0 border-r border-slate-200 overflow-hidden',
            mobileTab === 'backlog' ? 'flex flex-col flex-1' : 'hidden lg:flex lg:flex-col'
          )}
        >
          <StoryPanel
            stories={room.stories}
            activeStoryId={room.activeStoryId}
            currentUser={currentUser}
            onAdd={addStory}
            onDelete={deleteStory}
            onSelect={selectStory}
          />
        </div>

        {/* Center — Voting area */}
        <div
          className={clsx(
            'flex-1 overflow-y-auto',
            mobileTab === 'voting' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
          )}
        >
          <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
            {!activeStory ? (
              /* No active story */
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-4xl">
                    🃏
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Ready to estimate</h2>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">
                    {isAdmin
                      ? 'Select a story from the backlog, or start a quick vote without one.'
                      : 'Waiting for the facilitator to start a vote.'}
                  </p>
                  {isAdmin && (
                    <div className="flex flex-col gap-3 items-center">
                      <button
                        onClick={startQuickVote}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-200 text-sm"
                      >
                        <Zap className="w-4 h-4" />
                        Start Quick Vote
                      </button>
                      {room.stories.length === 0 && (
                        <p className="text-xs text-slate-400">
                          Or add stories to the backlog →
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Story header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={clsx(
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            votingPhase && 'bg-blue-100 text-blue-700',
                            revealedPhase && 'bg-amber-100 text-amber-700',
                            activeStory.status === 'done' && 'bg-emerald-100 text-emerald-700',
                            activeStory.status === 'pending' && 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {votingPhase && '⏱ Voting'}
                          {revealedPhase && '👀 Revealed'}
                          {activeStory.status === 'done' && `✓ Est: ${activeStory.finalEstimate}`}
                          {activeStory.status === 'pending' && 'Pending'}
                        </span>
                        {votingPhase && (
                          <span className="text-xs text-slate-500">
                            {votedCount}/{connectedUsers.length} voted
                            {allVoted && ' · All in!'}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 leading-snug">
                        {activeStory.title}
                      </h2>
                      {activeStory.description && (
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                          {activeStory.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Voting cards (only when voting & not yet revealed) */}
                {votingPhase && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <VotingCards
                      selectedVote={myVote}
                      onVote={(v) => submitVote(activeStory.id, v)}
                      disabled={false}
                    />

                    {/* Reveal button for admin */}
                    {isAdmin && (
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {allVoted ? '✓ All participants have voted' : `Waiting for ${connectedUsers.length - votedCount} more…`}
                        </span>
                        <button
                          onClick={() => revealVotes(activeStory.id)}
                          className={clsx(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all',
                            allVoted
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 animate-bounce-once'
                              : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
                          )}
                        >
                          <Eye className="w-4 h-4" />
                          Reveal Votes
                        </button>
                      </div>
                    )}

                    {!isAdmin && hasVoted && (
                      <div className="mt-4 text-center text-sm text-slate-500">
                        Waiting for the facilitator to reveal votes…
                      </div>
                    )}
                  </div>
                )}

                {/* Vote results (revealed phase) */}
                {(revealedPhase || activeStory.status === 'done') && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <VoteResults
                      story={activeStory}
                      isAdmin={isAdmin}
                      onRevote={() => resetVotes(activeStory.id)}
                      onSetEstimate={(est) => setEstimate(activeStory.id, est)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar — Participants */}
        <div
          className={clsx(
            'w-64 flex-shrink-0 border-l border-slate-100 overflow-hidden',
            mobileTab === 'team' ? 'flex flex-col flex-1' : 'hidden lg:flex lg:flex-col'
          )}
        >
          <ParticipantsPanel
            users={room.users}
            currentUserId={userId}
            activeStory={activeStory}
            isAdmin={isAdmin}
            onPromote={promoteUser}
          />
        </div>
      </div>
    </div>
  );
}

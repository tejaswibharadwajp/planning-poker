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
  VolumeX,
  Crown,
  MessageSquarePlus,
  Timer,
} from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useUser } from '@clerk/clerk-react';
import { writeBackToADO } from '../utils/adoWriteBack';
import { writeBackToJira } from '../utils/jiraWriteBack';
import { DECK_CARDS, FREE_VOTER_LIMIT } from '../types';
import StoryPanel from '../components/StoryPanel';
import VotingCards from '../components/VotingCards';
import ParticipantsPanel from '../components/ParticipantsPanel';
import VoteResults from '../components/VoteResults';
import FeedbackModal from '../components/FeedbackModal';
import clsx from 'clsx';

const REACTION_EMOJIS = ['👍', '🔥', '😬', '🤔', '🎉'];

export default function Room() {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const {
    room,
    userId,
    connected,
    error,
    kicked,
    reactions,
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
    kickUser,
    toggleMute,
    sendReaction,
    renameUser,
    leaveRoom,
    startQuickVote,
    upgradePlan,
  } = useSocket();

  const { user } = useUser();
  const [showFeedback, setShowFeedback] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<'backlog' | 'voting' | 'team'>('voting');
  const [writeBackToast, setWriteBackToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Direct URL join state — pre-fill from Clerk
  const [joinName, setJoinName] = useState(
    () => user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress?.split('@')[0] || ''
  );
  const [joinLoading, setJoinLoading] = useState(false);

  const handleSetEstimate = (storyId: string, estimate: string) => {
    setEstimate(storyId, estimate);
    const story = room?.stories.find((s) => s.id === storyId);
    if (story) {
      const showToast = (msg: string, ok: boolean) => {
        setWriteBackToast({ msg, ok });
        setTimeout(() => setWriteBackToast(null), 3000);
      };
      writeBackToADO(story.title, estimate)
        .then((ok) => { if (ok) showToast('ADO updated', true); })
        .catch(() => {});
      writeBackToJira(story.title, estimate)
        .then((ok) => { if (ok) showToast('Jira updated', true); })
        .catch(() => {});
    }
  };

  // Capture at mount — true only if prior confirmed session (has userId)
  const [hasValidSession] = useState(() => {
    try {
      const s = sessionStorage.getItem('poker_session');
      return s ? !!JSON.parse(s)?.userId : false;
    } catch {
      return false;
    }
  });

  // Redirect when kicked
  useEffect(() => {
    if (kicked) navigate('/');
  }, [kicked, navigate]);

  useEffect(() => {
    if (room || error) setJoinLoading(false);
  }, [room, error]);

  useEffect(() => {
    if (!room?.votingStartedAt) { setElapsedSecs(0); return; }
    const update = () => setElapsedSecs(Math.floor((Date.now() - room.votingStartedAt!) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [room?.votingStartedAt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!room) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const me = room.users.find((u) => u.id === userId);
      if (!me) return;

      const activeStory = room.stories.find((s) => s.id === room.activeStoryId) ?? null;
      const deckCards = DECK_CARDS[room.deckType] ?? DECK_CARDS.fibonacci;

      // 1–9: select Nth card (1-indexed)
      const digit = parseInt(e.key);
      if (!isNaN(digit) && digit >= 1 && digit <= 9) {
        const card = deckCards[digit - 1];
        if (card && activeStory?.status === 'voting' && !me.isSpectator && !me.isMuted) {
          submitVote(activeStory.id, card);
        }
        return;
      }

      // Space: reveal votes (admin, voting phase)
      if (e.key === ' ' && me.isAdmin && activeStory?.status === 'voting') {
        e.preventDefault();
        revealVotes(activeStory.id);
        return;
      }

      // r/R: revote (admin, revealed phase)
      if ((e.key === 'r' || e.key === 'R') && me.isAdmin && activeStory?.status === 'revealed') {
        resetVotes(activeStory.id);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [room, userId, submitVote, revealVotes, resetVotes]);

  if (!room && hasValidSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          {error ? (
            <>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-slate-700 font-semibold mb-1">Couldn't rejoin room</p>
              <p className="text-slate-500 text-sm mb-5">{error}</p>
              <button
                onClick={() => { leaveRoom(); navigate('/'); }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Go Home
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 font-medium">Reconnecting to room…</p>
            </>
          )}
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
  const deckCards = DECK_CARDS[room.deckType] ?? DECK_CARDS.fibonacci;
  const isAtFreeLimit = room.plan === 'free' && room.users.filter((u) => u.isConnected && !u.isSpectator).length >= FREE_VOTER_LIMIT;
  const isSpectator = currentUser?.isSpectator ?? false;
  const isMuted = currentUser?.isMuted ?? false;
  const activeStory = room.stories.find((s) => s.id === room.activeStoryId) ?? null;
  const myVote = currentUser?.vote ?? null;
  const hasVoted = currentUser?.hasVoted ?? false;

  const votingPhase = activeStory?.status === 'voting';
  const revealedPhase = activeStory?.status === 'revealed';
  const connectedUsers = room.users.filter((u) => u.isConnected);
  const votingUsers = connectedUsers.filter((u) => !u.isSpectator);
  const votedCount = votingUsers.filter((u) => u.hasVoted).length;
  const allVoted = votingUsers.length > 0 && votedCount === votingUsers.length;

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
      {/* ── Write-back toast ── */}
      {writeBackToast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold ${writeBackToast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <Check className="w-4 h-4" />
          {writeBackToast.msg}
        </div>
      )}

      {/* ── Floating reactions overlay ── */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-20 reaction-float text-3xl select-none"
            style={{ left: `${r.x}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <header className="h-14 bg-slate-900 flex items-center px-3 gap-2 sm:gap-4 sm:px-4 flex-shrink-0 border-b border-slate-800">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
            <span className="text-white font-bold text-sm">♠</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:block">Plan by Poker</span>
        </div>

        {/* Room name */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <h1 className="text-white font-semibold text-sm truncate">{room.name}</h1>
          {room.plan === 'pro' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
              <Crown className="w-2.5 h-2.5" />PRO
            </span>
          )}
        </div>

        {/* Upgrade nudge */}
        {isAdmin && isAtFreeLimit && (
          <button
            onClick={upgradePlan}
            className="hidden sm:flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <Crown className="w-3 h-3" />
            Upgrade
          </button>
        )}

        {/* Room code */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors group"
        >
          <span className="text-slate-400 text-xs hidden sm:block">Code:</span>
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
          className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium group"
        >
          {linkCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              <span className="text-slate-400 group-hover:text-white transition-colors">Share</span>
            </>
          )}
        </button>

        {/* Connection status */}
        <div className={clsx('hidden sm:flex items-center gap-1.5 text-xs font-medium', connected ? 'text-emerald-400' : 'text-red-400')}>
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:block">{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Users count */}
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs">
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
            roomName={room.name}
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
                      : isSpectator
                      ? 'Watching as spectator. Waiting for facilitator to start a vote.'
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
                          <span className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{votedCount}/{votingUsers.length} voted{allVoted && ' · All in!'}</span>
                            {elapsedSecs > 0 && (
                              <span className={clsx('inline-flex items-center gap-1 font-mono', elapsedSecs >= 120 ? 'text-red-500' : elapsedSecs >= 60 ? 'text-amber-500' : 'text-slate-400')}>
                                <Timer className="w-3 h-3" />
                                {Math.floor(elapsedSecs / 60)}:{String(elapsedSecs % 60).padStart(2, '0')}
                              </span>
                            )}
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

                {/* Voting cards */}
                {votingPhase && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    {isSpectator ? (
                      <div className="text-center py-6 text-slate-500 text-sm">
                        👁 Spectator mode — watching the vote
                      </div>
                    ) : isMuted ? (
                      <div className="text-center py-6">
                        <VolumeX className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">You've been muted by the facilitator</p>
                      </div>
                    ) : (
                      <>
                        <VotingCards
                          selectedVote={myVote}
                          onVote={(v) => submitVote(activeStory.id, v)}
                          disabled={false}
                          cards={deckCards}
                          deckType={room.deckType}
                        />

                        {/* Reveal button for admin */}
                        {isAdmin && (
                          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {allVoted ? '✓ All participants have voted' : `Waiting for ${votingUsers.length - votedCount} more…`}
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
                      </>
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
                      onSetEstimate={(est) => handleSetEstimate(activeStory.id, est)}
                      cards={deckCards}
                    />
                  </div>
                )}

                {/* Reaction bar */}
                <div className="flex items-center justify-center gap-2 pb-2">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => sendReaction(emoji)}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-xl transition-all hover:scale-110 shadow-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
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
            onKick={kickUser}
            onToggleMute={toggleMute}
            onRename={renameUser}
          />
        </div>
      </div>

      {/* Floating feedback pill */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all duration-150"
      >
        <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
        Feedback
      </button>

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          defaultName={user?.fullName || user?.firstName || ''}
        />
      )}
    </div>
  );
}

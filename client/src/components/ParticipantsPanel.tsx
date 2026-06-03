import { CheckCircle2, Clock, WifiOff, Crown, VolumeX, X, Pencil } from 'lucide-react';
import { useState, useRef } from 'react';
import { User, Story, getAvatarColor, getInitials } from '../types';
import clsx from 'clsx';

interface Props {
  users: User[];
  currentUserId: string | null;
  activeStory: Story | null;
  isAdmin: boolean;
  onPromote: (userId: string) => void;
  onKick: (userId: string) => void;
  onToggleMute: (userId: string) => void;
  onRename: (newName: string) => void;
}

export default function ParticipantsPanel({
  users,
  currentUserId,
  activeStory,
  isAdmin,
  onPromote,
  onKick,
  onToggleMute,
  onRename,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (currentName: string) => {
    setNameInput(currentName);
    setEditingName(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length >= 2) onRename(trimmed);
    setEditingName(false);
  };
  const votingActive = activeStory?.status === 'voting';
  const revealed = activeStory?.status === 'revealed' || activeStory?.status === 'done';

  const voters = users.filter((u) => u.isConnected && !u.isSpectator);
  const votedCount = voters.filter((u) => u.hasVoted).length;
  const activeCount = users.filter((u) => u.isConnected).length;

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-100">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900">Participants</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {activeCount} online
          </span>
        </div>

        {votingActive && voters.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{votedCount} of {voters.length} voted</span>
              {votedCount === voters.length && (
                <span className="text-emerald-600 font-semibold">All in!</span>
              )}
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${voters.length > 0 ? (votedCount / voters.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1.5">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const avatarColor = getAvatarColor(user.name);
          const initials = getInitials(user.name);

          return (
            <div
              key={user.id}
              className={clsx(
                'group flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors',
                isCurrentUser ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50',
                !user.isConnected && 'opacity-40'
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold',
                    avatarColor,
                    user.isSpectator && 'opacity-60'
                  )}
                >
                  {initials}
                </div>
                {!user.isConnected && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-400 rounded-full border-2 border-white flex items-center justify-center">
                    <WifiOff className="w-1.5 h-1.5 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isCurrentUser && editingName ? (
                    <input
                      ref={inputRef}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
                        if (e.key === 'Escape') { setEditingName(false); }
                      }}
                      maxLength={32}
                      className="text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
                    />
                  ) : (
                    <span className={clsx('text-sm font-medium truncate', isCurrentUser ? 'text-indigo-700' : 'text-slate-800')}>
                      {user.name}
                    </span>
                  )}
                  {isCurrentUser && !editingName && (
                    <span className="text-xs text-indigo-500 font-medium">(You)</span>
                  )}
                  {isCurrentUser && !editingName && (
                    <button
                      onClick={() => startEdit(user.name)}
                      title="Edit name"
                      className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center text-indigo-400 hover:text-indigo-600"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  {user.isAdmin && (
                    <span title="Facilitator"><Crown className="w-3 h-3 text-amber-500 flex-shrink-0" /></span>
                  )}
                  {user.isSpectator && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      Spectator
                    </span>
                  )}
                  {user.isMuted && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 flex items-center gap-0.5">
                      <VolumeX className="w-2.5 h-2.5" />
                      Muted
                    </span>
                  )}
                </div>
                {!user.isConnected && (
                  <span className="text-xs text-slate-400">Disconnected</span>
                )}
              </div>

              {/* Vote status (voters only) */}
              {!user.isSpectator && (
                <div className="flex-shrink-0">
                  {votingActive && (
                    user.hasVoted ? (
                      <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center" title="Voted">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                    ) : user.isMuted ? null : (
                      <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center" title="Waiting">
                        <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
                      </div>
                    )
                  )}

                  {revealed && user.vote !== null && (
                    <div className="w-8 h-10 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {user.vote}
                    </div>
                  )}

                  {revealed && !user.hasVoted && user.isConnected && (
                    <div className="w-8 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                      —
                    </div>
                  )}
                </div>
              )}

              {/* Mute toggle — single icon, color shows state */}
              {isAdmin && !isCurrentUser && user.isConnected && !user.isSpectator && !user.isAdmin && (
                <button
                  onClick={() => onToggleMute(user.id)}
                  title={user.isMuted ? 'Unmute' : 'Mute'}
                  className={clsx(
                    'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-colors',
                    user.isMuted
                      ? 'bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600'
                      : 'text-slate-300 hover:bg-slate-100 hover:text-slate-600'
                  )}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Promote + kick drawer — slides in on hover */}
              {isAdmin && !isCurrentUser && user.isConnected && (
                <div className="flex-shrink-0 overflow-hidden max-w-0 opacity-0 group-hover:max-w-[4rem] group-hover:opacity-100 transition-all duration-200 ease-out flex items-center gap-1">
                  {!user.isAdmin && (
                    <button
                      onClick={() => onPromote(user.id)}
                      title="Make facilitator"
                      className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      <Crown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onKick(user.id)}
                    title="Remove from room"
                    className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

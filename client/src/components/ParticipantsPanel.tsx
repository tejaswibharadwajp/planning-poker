import { CheckCircle2, Clock, WifiOff, Crown } from 'lucide-react';
import { User, Story, getAvatarColor, getInitials } from '../types';
import clsx from 'clsx';

interface Props {
  users: User[];
  currentUserId: string | null;
  activeStory: Story | null;
  isAdmin: boolean;
  onPromote: (userId: string) => void;
}

export default function ParticipantsPanel({
  users,
  currentUserId,
  activeStory,
  isAdmin,
  onPromote,
}: Props) {
  const votingActive = activeStory?.status === 'voting';
  const revealed = activeStory?.status === 'revealed' || activeStory?.status === 'done';

  const votedCount = users.filter((u) => u.isConnected && u.hasVoted).length;
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

        {votingActive && activeCount > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span>{votedCount} of {activeCount} voted</span>
              {votedCount === activeCount && (
                <span className="text-emerald-600 font-semibold">All in!</span>
              )}
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${activeCount > 0 ? (votedCount / activeCount) * 100 : 0}%` }}
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                isCurrentUser ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50',
                !user.isConnected && 'opacity-40'
              )}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold',
                    avatarColor
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
                <div className="flex items-center gap-1.5">
                  <span className={clsx('text-sm font-medium truncate', isCurrentUser ? 'text-indigo-700' : 'text-slate-800')}>
                    {user.name}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs text-indigo-500 font-medium">(You)</span>
                  )}
                  {user.isAdmin && (
                    <span title="Facilitator"><Crown className="w-3 h-3 text-amber-500 flex-shrink-0" /></span>
                  )}
                </div>
                {!user.isConnected && (
                  <span className="text-xs text-slate-400">Disconnected</span>
                )}
              </div>

              {/* Vote status */}
              <div className="flex-shrink-0">
                {votingActive && (
                  user.hasVoted ? (
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center" title="Voted">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center" title="Waiting">
                      <Clock className="w-4 h-4 text-slate-400 animate-pulse" />
                    </div>
                  )
                )}

                {revealed && user.vote !== null && (
                  <div className="w-8 h-10 bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md animate-flip-in">
                    {user.vote}
                  </div>
                )}

                {revealed && !user.hasVoted && user.isConnected && (
                  <div className="w-8 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    —
                  </div>
                )}
              </div>

              {/* Promote button (admin only, not for self, not already admin) */}
              {isAdmin && !isCurrentUser && !user.isAdmin && user.isConnected && (
                <button
                  onClick={() => onPromote(user.id)}
                  title="Make facilitator"
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-amber-50 hover:text-amber-600 text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Crown className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

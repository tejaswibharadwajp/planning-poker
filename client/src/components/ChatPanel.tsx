import { useState, useRef, useEffect } from 'react';
import { Send, Lock } from 'lucide-react';
import { ChatMessage, User, getAvatarColor, getInitials } from '../types';
import clsx from 'clsx';

interface Props {
  messages: ChatMessage[];
  currentUserId: string | null;
  users: User[];
  onSend: (message: string, toUserId?: string) => void;
}

export default function ChatPanel({ messages, currentUserId, users, onSend }: Props) {
  const [input, setInput] = useState('');
  const [toUserId, setToUserId] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const connectedOthers = users.filter((u) => u.isConnected && u.id !== currentUserId);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed, toUserId || undefined);
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-white border-t border-slate-100">
      {/* Header */}
      <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-900">Chat</h2>
        {messages.length > 0 && (
          <span className="text-xs text-slate-400">{messages.length}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center pt-4">No messages yet</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.fromUserId === currentUserId;
            const isPrivate = !!msg.toUserId;
            const avatarColor = getAvatarColor(msg.fromName);
            const initials = getInitials(msg.fromName);

            return (
              <div
                key={msg.id}
                className={clsx(
                  'flex gap-2',
                  isMe ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar — only for others */}
                {!isMe && (
                  <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5', avatarColor)}>
                    {initials}
                  </div>
                )}

                <div className={clsx('max-w-[75%] space-y-0.5', isMe && 'items-end flex flex-col')}>
                  {/* Sender name + private tag */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500">{msg.fromName}</span>
                      {isPrivate && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-violet-500 bg-violet-50 px-1 py-0.5 rounded">
                          <Lock className="w-2 h-2" /> Private
                        </span>
                      )}
                    </div>
                  )}
                  {isMe && isPrivate && (
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold text-violet-500 bg-violet-50 px-1 py-0.5 rounded">
                        <Lock className="w-2 h-2" /> to {msg.toName}
                      </span>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={clsx(
                      'px-2.5 py-1.5 rounded-xl text-xs leading-relaxed break-words',
                      isMe
                        ? isPrivate
                          ? 'bg-violet-100 text-violet-900 rounded-tr-sm'
                          : 'bg-indigo-600 text-white rounded-tr-sm'
                        : isPrivate
                        ? 'bg-violet-50 text-violet-900 rounded-tl-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    )}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-100 p-2 space-y-1.5">
        {/* Private recipient picker */}
        {connectedOthers.length > 0 && (
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Everyone (public)</option>
            {connectedOthers.map((u) => (
              <option key={u.id} value={u.id}>
                🔒 Private → {u.name}
              </option>
            ))}
          </select>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="flex items-center gap-1.5"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={toUserId ? 'Private message…' : 'Message everyone…'}
            maxLength={500}
            className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-slate-400 bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

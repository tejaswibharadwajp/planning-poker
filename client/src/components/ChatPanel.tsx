import { useState, useRef, useEffect } from 'react';
import { Send, Lock } from 'lucide-react';
import { ChatMessage, User, getAvatarColor, getInitials } from '../types';
import clsx from 'clsx';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface Props {
  messages: ChatMessage[];
  currentUserId: string | null;
  users: User[];
  onSend: (message: string, toUserId?: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

const PICKER_WIDTH = 212; // 6 × 28px + 2 × 8px padding

function MessageBubble({
  msg,
  currentUserId,
  onReact,
}: {
  msg: ChatMessage;
  currentUserId: string | null;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isMe = msg.fromUserId === currentUserId;
  const isPrivate = !!msg.toUserId;
  const avatarColor = getAvatarColor(msg.fromName);
  const initials = getInitials(msg.fromName);

  const togglePicker = () => {
    if (anchor) { setAnchor(null); return; }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setAnchor(rect);
  };

  useEffect(() => {
    if (!anchor) return;
    const handler = (e: MouseEvent) => {
      if (
        !pickerRef.current?.contains(e.target as Node) &&
        !btnRef.current?.contains(e.target as Node)
      ) setAnchor(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchor]);

  // Fixed position: above the button, clamped to viewport
  const pickerStyle = anchor
    ? {
        position: 'fixed' as const,
        top: anchor.top - 8,
        transform: 'translateY(-100%)',
        left: Math.max(
          8,
          Math.min(
            isMe ? anchor.left : anchor.right - PICKER_WIDTH,
            window.innerWidth - PICKER_WIDTH - 8
          )
        ),
        zIndex: 9999,
      }
    : undefined;

  const reactionEntries = Object.entries(msg.reactions).filter(([, ids]) => ids.length > 0);

  return (
    <div className={clsx('flex gap-2 group', isMe ? 'flex-row-reverse' : 'flex-row')}>
      {!isMe && (
        <div className={clsx('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5', avatarColor)}>
          {initials}
        </div>
      )}

      <div className={clsx('max-w-[75%] space-y-0.5', isMe && 'items-end flex flex-col')}>
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

        <div className={clsx('flex items-center gap-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
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

          {/* React trigger button */}
          <button
            ref={btnRef}
            onClick={togglePicker}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-[11px]"
            title="Add reaction"
          >
            😊
          </button>
        </div>

        {/* Reaction pills */}
        {reactionEntries.length > 0 && (
          <div className={clsx('flex flex-wrap gap-1 mt-0.5', isMe && 'justify-end')}>
            {reactionEntries.map(([emoji, ids]) => {
              const myReacted = ids.includes(currentUserId ?? '');
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(msg.id, emoji)}
                  className={clsx(
                    'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors',
                    myReacted
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {emoji} {ids.length}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed picker — renders above overflow-clipping ancestors */}
      {anchor && (
        <div ref={pickerRef} style={pickerStyle} className="flex gap-1 bg-white border border-slate-200 rounded-xl shadow-xl px-2 py-1.5">
          {REACTION_EMOJIS.map((emoji) => {
            const myReacted = msg.reactions[emoji]?.includes(currentUserId ?? '') ?? false;
            return (
              <button
                key={emoji}
                onClick={() => { onReact(msg.id, emoji); setAnchor(null); }}
                className={clsx(
                  'text-base w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-slate-100',
                  myReacted && 'bg-indigo-50 ring-1 ring-indigo-300'
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ messages, currentUserId, users, onSend, onReact }: Props) {
  const [input, setInput] = useState('');
  const [toUserId, setToUserId] = useState<string>('');
  const [unseenCount, setUnseenCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevLenRef = useRef(messages.length);

  const checkBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (isAtBottomRef.current) setUnseenCount(0);
  };

  useEffect(() => {
    const newCount = messages.length - prevLenRef.current;
    prevLenRef.current = messages.length;
    if (newCount <= 0) return;
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setUnseenCount((n) => n + newCount);
    }
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
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Chat</h2>
          {unseenCount > 0 && (
            <button
              onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnseenCount(0); }}
              className="flex items-center gap-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse hover:bg-indigo-700 transition-colors"
            >
              {unseenCount} new ↓
            </button>
          )}
        </div>
        {messages.length > 0 && (
          <span className="text-xs text-slate-400">{messages.length}</span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={checkBottom}
        className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-2 min-h-0"
      >
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center pt-4">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              currentUserId={currentUserId}
              onReact={onReact}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-slate-100 p-2 space-y-1.5">
        {connectedOthers.length > 0 && (
          <select
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="w-full text-[16px] lg:text-xs border border-slate-200 rounded-lg px-2 py-2 lg:py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
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
            className="flex-1 text-[16px] lg:text-xs border border-slate-200 rounded-lg px-2.5 py-2 lg:py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder-slate-400 bg-white"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 lg:w-7 lg:h-7 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

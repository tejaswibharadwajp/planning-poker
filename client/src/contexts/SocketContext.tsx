import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { Room, Reaction } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

interface SocketContextValue {
  room: Room | null;
  userId: string | null;
  error: string | null;
  connected: boolean;
  kicked: boolean;
  reactions: Reaction[];
  startQuickVote: () => void;
  joinRoom: (params: {
    roomName?: string;
    roomCode?: string;
    userName: string;
    isSpectator?: boolean;
  }) => void;
  addStory: (title: string, description?: string) => void;
  deleteStory: (storyId: string) => void;
  selectStory: (storyId: string) => void;
  submitVote: (storyId: string, vote: string) => void;
  revealVotes: (storyId: string) => void;
  resetVotes: (storyId: string) => void;
  setEstimate: (storyId: string, estimate: string) => void;
  promoteUser: (targetUserId: string) => void;
  kickUser: (targetUserId: string) => void;
  toggleMute: (targetUserId: string) => void;
  sendReaction: (emoji: string) => void;
  leaveRoom: () => void;
  clearError: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const saved = sessionStorage.getItem('poker_session');
      if (saved) {
        try {
          const { roomCode, userId: savedId, userName } = JSON.parse(saved);
          if (roomCode && savedId && userName) {
            socket.emit('rejoin-room', { roomCode, userId: savedId, userName });
          }
        } catch {
          sessionStorage.removeItem('poker_session');
        }
      }
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room-joined', ({ room: r, userId: uid }: { room: Room; userId: string }) => {
      setRoom(r);
      setUserId(uid);
      setError(null);
      const saved = sessionStorage.getItem('poker_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          sessionStorage.setItem(
            'poker_session',
            JSON.stringify({ ...parsed, userId: uid, roomCode: r.code })
          );
        } catch {
          /* ignore */
        }
      }
    });

    socket.on('room-updated', ({ room: r }: { room: Room }) => setRoom(r));

    socket.on('error', ({ message }: { message: string }) => setError(message));

    socket.on('kicked', () => {
      sessionStorage.removeItem('poker_session');
      setRoom(null);
      setUserId(null);
      setKicked(true);
    });

    socket.on('reaction', (r: Omit<Reaction, 'x'>) => {
      const reaction: Reaction = { ...r, x: 10 + Math.random() * 80 };
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((rx) => rx.id !== reaction.id));
      }, 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinRoom = useCallback(
    (params: { roomName?: string; roomCode?: string; userName: string; isSpectator?: boolean }) => {
      sessionStorage.setItem(
        'poker_session',
        JSON.stringify({
          userName: params.userName,
          roomCode: params.roomCode?.toUpperCase() || '',
        })
      );
      socketRef.current?.emit('join-room', params);
    },
    []
  );

  const startQuickVote = useCallback(
    () => socketRef.current?.emit('start-quick-vote'),
    []
  );

  const leaveRoom = useCallback(() => {
    sessionStorage.removeItem('poker_session');
    setRoom(null);
    setUserId(null);
    socketRef.current?.disconnect();
    setTimeout(() => socketRef.current?.connect(), 100);
  }, []);

  const addStory = useCallback(
    (title: string, description?: string) =>
      socketRef.current?.emit('add-story', { title, description }),
    []
  );

  const deleteStory = useCallback(
    (storyId: string) =>
      socketRef.current?.emit('delete-story', { storyId }),
    []
  );

  const selectStory = useCallback(
    (storyId: string) =>
      socketRef.current?.emit('select-story', { storyId }),
    []
  );

  const submitVote = useCallback(
    (storyId: string, vote: string) =>
      socketRef.current?.emit('submit-vote', { storyId, vote }),
    []
  );

  const revealVotes = useCallback(
    (storyId: string) =>
      socketRef.current?.emit('reveal-votes', { storyId }),
    []
  );

  const resetVotes = useCallback(
    (storyId: string) =>
      socketRef.current?.emit('reset-votes', { storyId }),
    []
  );

  const setEstimate = useCallback(
    (storyId: string, estimate: string) =>
      socketRef.current?.emit('set-estimate', { storyId, estimate }),
    []
  );

  const promoteUser = useCallback(
    (targetUserId: string) =>
      socketRef.current?.emit('promote-user', { targetUserId }),
    []
  );

  const kickUser = useCallback(
    (targetUserId: string) =>
      socketRef.current?.emit('kick-user', { targetUserId }),
    []
  );

  const toggleMute = useCallback(
    (targetUserId: string) =>
      socketRef.current?.emit('toggle-mute', { targetUserId }),
    []
  );

  const sendReaction = useCallback(
    (emoji: string) =>
      socketRef.current?.emit('send-reaction', { emoji }),
    []
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <SocketContext.Provider
      value={{
        room,
        userId,
        error,
        connected,
        kicked,
        reactions,
        startQuickVote,
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
        leaveRoom,
        clearError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

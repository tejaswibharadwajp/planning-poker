import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import {
  dbCreateRoom,
  dbCreateStory,
  dbUpsertVote,
  dbSetStoryEstimate,
  dbUpdateStoryStatus,
  dbSubmitFeedback,
  dbGetTestimonials,
} from './db';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'https://planbypoker.com'];

interface User {
  id: string;
  socketId: string;
  name: string;
  clerkUserId?: string;
  isAdmin: boolean;
  isSpectator: boolean;
  isMuted: boolean;
  vote: string | null;
  hasVoted: boolean;
  isConnected: boolean;
}

interface StoryVote {
  vote: string;
  userName: string;
}

interface Story {
  id: string;
  title: string;
  description: string;
  votes: Record<string, StoryVote>;
  finalEstimate: string | null;
  status: 'pending' | 'voting' | 'revealed' | 'done';
}

interface Room {
  id: string;
  name: string;
  code: string;
  password: string | null;
  users: User[];
  stories: Story[];
  activeStoryId: string | null;
  createdAt: number;
  plan: 'free' | 'pro';
  deckType: string;
  votingStartedAt: number | null;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getRoomByCode(code: string): Room | undefined {
  return Array.from(rooms.values()).find((r) => r.code === code);
}

function sanitizeRoom(room: Room) {
  const activeStory = room.stories.find((s) => s.id === room.activeStoryId);
  const votesRevealed =
    activeStory?.status === 'revealed' || activeStory?.status === 'done';

  return {
    ...room,
    users: room.users.map((u) => ({
      id: u.id,
      name: u.name,
      isAdmin: u.isAdmin,
      isSpectator: u.isSpectator,
      isMuted: u.isMuted,
      hasVoted: u.hasVoted,
      vote: votesRevealed ? u.vote : u.hasVoted ? '?' : null,
      isConnected: u.isConnected,
    })),
    stories: room.stories.map((s) => ({
      ...s,
      votes:
        s.status === 'revealed' || s.status === 'done'
          ? s.votes
          : Object.fromEntries(
              Object.entries(s.votes).map(([uid, v]) => [
                uid,
                { ...v, vote: '?' },
              ])
            ),
    })),
  };
}

const app = express();

// Trust the first proxy hop (Render/Railway/Fly set X-Forwarded-For)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — restrict to known frontend origins
app.use(cors({
  origin: (origin, cb) => {
    // allow server-to-server / curl in dev (no origin header)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '16kb' }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const feedbackLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions. Try again in 15 minutes.' },
});

app.use(generalLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

app.get('/api/testimonials', async (_req, res) => {
  try {
    const testimonials = await dbGetTestimonials();
    res.json({ testimonials });
  } catch {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

app.post('/api/feedback', feedbackLimiter, async (req, res) => {
  const { name, role, quote, rating } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Name required (min 2 chars)' });
    return;
  }
  if (!quote || typeof quote !== 'string' || quote.trim().length < 10) {
    res.status(400).json({ error: 'Feedback required (min 10 chars)' });
    return;
  }
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be 1–5' });
    return;
  }
  try {
    await dbSubmitFeedback({
      name: name.trim().slice(0, 64),
      role: role ? String(role).trim().slice(0, 64) : undefined,
      quote: quote.trim().slice(0, 500),
      rating,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
  maxHttpBufferSize: 16 * 1024,
});

// Per-socket event rate limiter: returns true if event should be dropped
function socketRateLimited(
  store: Map<string, number[]>,
  key: string,
  maxPerWindow: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= maxPerWindow) return true;
  hits.push(now);
  store.set(key, hits);
  return false;
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  // Per-connection rate limit buckets
  const rateBuckets = new Map<string, number[]>();
  const limited = (event: string, max: number, windowMs: number) =>
    socketRateLimited(rateBuckets, event, max, windowMs);

  socket.on(
    'join-room',
    ({
      roomName,
      roomCode,
      userName,
      isSpectator = false,
      clerkUserId,
      deckType = 'fibonacci',
      password,
    }: {
      roomName?: string;
      roomCode?: string;
      userName: string;
      isSpectator?: boolean;
      clerkUserId?: string;
      deckType?: string;
      password?: string;
    }) => {
      let room: Room;
      const userId = uuidv4();

      if (roomCode) {
        const existing = getRoomByCode(roomCode.toUpperCase());
        if (!existing) {
          socket.emit('error', {
            message: 'Room not found. Double-check the code.',
          });
          return;
        }
        room = existing;

        if (room.password && (!password || password.trim() !== room.password)) {
          socket.emit('error', { message: 'Incorrect room password.' });
          return;
        }

        // Enforce free plan limit for non-spectators
        if (!isSpectator && room.plan === 'free') {
          const votingCount = room.users.filter((u) => u.isConnected && !u.isSpectator).length;
          if (votingCount >= 15) {
            socket.emit('error', {
              message: 'Room is at the 15-member free limit. Ask the facilitator to upgrade to Pro.',
            });
            return;
          }
        }

        room.users.push({
          id: userId,
          socketId: socket.id,
          name: userName,
          clerkUserId,
          isAdmin: false,
          isSpectator: !!isSpectator,
          isMuted: false,
          vote: null,
          hasVoted: false,
          isConnected: true,
        });
      } else {
        const code = generateRoomCode();
        const roomId = uuidv4();
        room = {
          id: roomId,
          name: roomName?.trim() || `${userName}'s Room`,
          code,
          password: password?.trim() || null,
          users: [
            {
              id: userId,
              socketId: socket.id,
              name: userName,
              clerkUserId,
              isAdmin: true,
              isSpectator: false,
              isMuted: false,
              vote: null,
              hasVoted: false,
              isConnected: true,
            },
          ],
          stories: [],
          activeStoryId: null,
          createdAt: Date.now(),
          plan: 'free',
          deckType: deckType || 'fibonacci',
          votingStartedAt: null,
        };
        rooms.set(room.id, room);
        // Persist room to DB (fire-and-forget)
        dbCreateRoom({
          id: roomId,
          code,
          name: room.name,
          adminId: clerkUserId || userId,
        }).catch(console.error);
      }

      socket.join(room.code);
      socket.data.userId = userId;
      socket.data.roomCode = room.code;

      socket.emit('room-joined', { room: sanitizeRoom(room), userId, password: room.password });
      io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
    }
  );

  socket.on(
    'rejoin-room',
    ({
      roomCode,
      userId,
      userName,
    }: {
      roomCode: string;
      userId: string;
      userName: string;
    }) => {
      const room = getRoomByCode(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room no longer exists.' });
        return;
      }

      let user = room.users.find((u) => u.id === userId);
      if (user) {
        user.socketId = socket.id;
        user.isConnected = true;
      } else {
        user = {
          id: userId,
          socketId: socket.id,
          name: userName,
          isAdmin: room.users.filter((u) => u.isConnected).length === 0,
          isSpectator: false,
          isMuted: false,
          vote: null,
          hasVoted: false,
          isConnected: true,
        };
        room.users.push(user);
      }

      socket.join(room.code);
      socket.data.userId = userId;
      socket.data.roomCode = room.code;

      socket.emit('room-joined', { room: sanitizeRoom(room), userId });
      io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
    }
  );

  socket.on('start-quick-vote', () => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;

    const quickCount = room.stories.filter((s) =>
      s.title.startsWith('Quick Vote')
    ).length;

    const story: Story = {
      id: uuidv4(),
      title: `Quick Vote${quickCount > 0 ? ` #${quickCount + 1}` : ''}`,
      description: '',
      votes: {},
      finalEstimate: null,
      status: 'voting',
    };
    room.stories.push(story);
    room.activeStoryId = story.id;
    room.votingStartedAt = Date.now();
    room.users.forEach((u) => {
      u.vote = null;
      u.hasVoted = false;
    });
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on(
    'add-story',
    ({ title, description }: { title: string; description?: string }) => {
      if (limited('add-story', 10, 60_000)) return; // max 10 per min
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user?.isAdmin) return;

      const storyId = uuidv4();
      const storyTitle = title.trim();
      const storyDesc = description?.trim() || '';
      room.stories.push({
        id: storyId,
        title: storyTitle,
        description: storyDesc,
        votes: {},
        finalEstimate: null,
        status: 'pending',
      });
      dbCreateStory({ id: storyId, roomId: room.id, title: storyTitle, description: storyDesc }).catch(console.error);
      io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
    }
  );

  socket.on('delete-story', ({ storyId }: { storyId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;

    room.stories = room.stories.filter((s) => s.id !== storyId);
    if (room.activeStoryId === storyId) room.activeStoryId = null;
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on('select-story', ({ storyId }: { storyId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;

    room.activeStoryId = storyId;
    const story = room.stories.find((s) => s.id === storyId);
    if (story && story.status === 'pending') story.status = 'voting';
    room.votingStartedAt = Date.now();
    room.users.forEach((u) => {
      u.vote = null;
      u.hasVoted = false;
    });
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on(
    'submit-vote',
    ({ storyId, vote }: { storyId: string; vote: string }) => {
      if (limited('submit-vote', 10, 10_000)) return; // max 10 per 10s
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user || user.isSpectator || user.isMuted) return;
      const story = room.stories.find((s) => s.id === storyId);
      if (!story || story.status !== 'voting') return;

      user.vote = vote;
      user.hasVoted = true;
      story.votes[user.id] = { vote, userName: user.name };
      dbUpsertVote({ storyId, userId: user.id, userName: user.name, vote }).catch(console.error);

      io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
    }
  );

  socket.on('reveal-votes', ({ storyId }: { storyId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;
    const story = room.stories.find((s) => s.id === storyId);
    if (!story) return;

    story.status = 'revealed';
    room.votingStartedAt = null;
    dbUpdateStoryStatus(storyId, 'revealed').catch(console.error);
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on('reset-votes', ({ storyId }: { storyId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;
    const story = room.stories.find((s) => s.id === storyId);
    if (!story) return;

    story.votes = {};
    story.status = 'voting';
    room.votingStartedAt = Date.now();
    room.users.forEach((u) => {
      u.vote = null;
      u.hasVoted = false;
    });
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on(
    'set-estimate',
    ({ storyId, estimate }: { storyId: string; estimate: string }) => {
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user?.isAdmin) return;
      const story = room.stories.find((s) => s.id === storyId);
      if (!story) return;

      story.finalEstimate = estimate;
      story.status = 'done';
      room.activeStoryId = null;
      room.votingStartedAt = null;
      dbSetStoryEstimate(storyId, estimate).catch(console.error);
      io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
    }
  );

  socket.on('promote-user', ({ targetUserId }: { targetUserId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;
    const target = room.users.find((u) => u.id === targetUserId);
    if (!target) return;

    target.isAdmin = true;
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on('kick-user', ({ targetUserId }: { targetUserId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;
    const target = room.users.find((u) => u.id === targetUserId);
    if (!target || target.id === user.id) return;

    io.to(target.socketId).emit('kicked');
    room.users = room.users.filter((u) => u.id !== targetUserId);
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on('toggle-mute', ({ targetUserId }: { targetUserId: string }) => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;
    const target = room.users.find((u) => u.id === targetUserId);
    if (!target || target.id === user.id) return;

    target.isMuted = !target.isMuted;
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on('rename-user', ({ newName }: { newName: string }) => {
    if (limited('rename-user', 3, 30_000)) return; // max 3 per 30s
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user) return;

    const trimmed = String(newName).trim().slice(0, 32);
    if (trimmed.length < 2) return;

    user.name = trimmed;
    for (const story of room.stories) {
      if (story.votes[user.id]) {
        story.votes[user.id].userName = trimmed;
      }
    }
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on('leave-room', () => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user) return;

    if (user.isAdmin) {
      // Clear chat for everyone in the room when any facilitator leaves
      io.to(room.code).emit('chat-cleared');

      const otherAdmins = room.users.filter((u) => u.id !== user.id && u.isAdmin && u.isConnected);
      if (otherAdmins.length === 0) {
        socket.to(room.code).emit('room-closed');
        rooms.delete(room.id);
        return;
      }
    }
  });

  socket.on('upgrade-plan', () => {
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user?.isAdmin) return;
    room.plan = 'pro';
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on(
    'react-to-chat',
    ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (limited('react-to-chat', 20, 10_000)) return;
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user) return;

      const ALLOWED = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
      if (!ALLOWED.includes(emoji)) return;

      io.to(room.code).emit('chat-reaction', {
        messageId,
        emoji,
        userId: user.id,
      });
    }
  );

  socket.on(
    'send-chat',
    ({ message, toUserId }: { message: string; toUserId?: string }) => {
      if (limited('send-chat', 10, 10_000)) return; // max 10 per 10s
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user) return;

      const trimmed = String(message).trim().slice(0, 500);
      if (!trimmed) return;

      const target = toUserId ? room.users.find((u) => u.id === toUserId) : undefined;

      const payload = {
        id: uuidv4(),
        fromUserId: user.id,
        fromName: user.name,
        message: trimmed,
        toUserId: target?.id,
        toName: target?.name,
        timestamp: Date.now(),
        reactions: {} as Record<string, string[]>,
      };

      if (target) {
        // Private: send only to sender and target
        socket.emit('chat-message', payload);
        if (target.socketId !== socket.id) {
          io.to(target.socketId).emit('chat-message', payload);
        }
      } else {
        io.to(room.code).emit('chat-message', payload);
      }
    }
  );

  socket.on('send-reaction', ({ emoji }: { emoji: string }) => {
    if (limited('send-reaction', 5, 3_000)) return; // max 5 per 3s
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (!user) return;

    io.to(room.code).emit('reaction', {
      id: uuidv4(),
      emoji,
      userName: user.name,
      userId: user.id,
    });
  });

  socket.on('disconnect', () => {
    rateBuckets.clear();
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    // Guard: if user already reconnected (new socketId), don't clobber isConnected
    if (user && user.socketId === socket.id) {
      user.isConnected = false;
      io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
    } else {
      return;
    }

    if (room.users.filter((u) => u.isConnected).length === 0) {
      setTimeout(() => {
        const r = rooms.get(room.id);
        if (r && r.users.filter((u) => u.isConnected).length === 0) {
          rooms.delete(room.id);
          console.log('Cleaned up empty room:', room.code);
        }
      }, 5 * 60 * 1000);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

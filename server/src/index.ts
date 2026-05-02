import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  socketId: string;
  name: string;
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
  users: User[];
  stories: Story[];
  activeStoryId: string | null;
  createdAt: number;
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
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on(
    'join-room',
    ({
      roomName,
      roomCode,
      userName,
      isSpectator = false,
    }: {
      roomName?: string;
      roomCode?: string;
      userName: string;
      isSpectator?: boolean;
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
        room.users.push({
          id: userId,
          socketId: socket.id,
          name: userName,
          isAdmin: false,
          isSpectator: !!isSpectator,
          isMuted: false,
          vote: null,
          hasVoted: false,
          isConnected: true,
        });
      } else {
        const code = generateRoomCode();
        room = {
          id: uuidv4(),
          name: roomName?.trim() || `${userName}'s Room`,
          code,
          users: [
            {
              id: userId,
              socketId: socket.id,
              name: userName,
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
        };
        rooms.set(room.id, room);
      }

      socket.join(room.code);
      socket.data.userId = userId;
      socket.data.roomCode = room.code;

      socket.emit('room-joined', { room: sanitizeRoom(room), userId });
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
    room.users.forEach((u) => {
      u.vote = null;
      u.hasVoted = false;
    });
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on(
    'add-story',
    ({ title, description }: { title: string; description?: string }) => {
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user?.isAdmin) return;

      room.stories.push({
        id: uuidv4(),
        title: title.trim(),
        description: description?.trim() || '',
        votes: {},
        finalEstimate: null,
        status: 'pending',
      });
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
    room.users.forEach((u) => {
      u.vote = null;
      u.hasVoted = false;
    });
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });
  });

  socket.on(
    'submit-vote',
    ({ storyId, vote }: { storyId: string; vote: string }) => {
      const room = getRoomByCode(socket.data.roomCode);
      if (!room) return;
      const user = room.users.find((u) => u.id === socket.data.userId);
      if (!user || user.isSpectator || user.isMuted) return;
      const story = room.stories.find((s) => s.id === storyId);
      if (!story || story.status !== 'voting') return;

      user.vote = vote;
      user.hasVoted = true;
      story.votes[user.id] = { vote, userName: user.name };

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

  socket.on('send-reaction', ({ emoji }: { emoji: string }) => {
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
    const room = getRoomByCode(socket.data.roomCode);
    if (!room) return;
    const user = room.users.find((u) => u.id === socket.data.userId);
    if (user) user.isConnected = false;
    io.to(room.code).emit('room-updated', { room: sanitizeRoom(room) });

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

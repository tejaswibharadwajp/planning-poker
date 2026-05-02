export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
  isSpectator: boolean;
  isMuted: boolean;
  vote: string | null;
  hasVoted: boolean;
  isConnected: boolean;
}

export interface Reaction {
  id: string;
  emoji: string;
  userName: string;
  userId: string;
  x: number;
}

export interface StoryVote {
  vote: string;
  userName: string;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  votes: Record<string, StoryVote>;
  finalEstimate: string | null;
  status: 'pending' | 'voting' | 'revealed' | 'done';
}

export interface Room {
  id: string;
  name: string;
  code: string;
  users: User[];
  stories: Story[];
  activeStoryId: string | null;
  createdAt: number;
}

export const FIBONACCI_CARDS = [
  '0', '½', '1', '2', '3', '5', '8', '13', '21', '40', '100', '☕',
];

export const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-orange-500',
  'bg-teal-500',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) & 0x7fffffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

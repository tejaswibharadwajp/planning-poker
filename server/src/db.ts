import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function dbCreateRoom(room: {
  id: string;
  code: string;
  name: string;
  adminId: string;
}) {
  await supabase.from('rooms').insert({
    id: room.id,
    code: room.code,
    name: room.name,
    admin_id: room.adminId,
  });
}

export async function dbCreateStory(story: {
  id: string;
  roomId: string;
  title: string;
  description: string;
}) {
  await supabase.from('stories').insert({
    id: story.id,
    room_id: story.roomId,
    title: story.title,
    description: story.description,
    status: 'pending',
  });
}

export async function dbUpsertVote(vote: {
  storyId: string;
  userId: string;
  userName: string;
  vote: string;
}) {
  await supabase.from('story_votes').upsert(
    {
      story_id: vote.storyId,
      user_id: vote.userId,
      user_name: vote.userName,
      vote: vote.vote,
    },
    { onConflict: 'story_id,user_id' }
  );
}

export async function dbSetStoryEstimate(storyId: string, estimate: string) {
  await supabase
    .from('stories')
    .update({ estimate, status: 'done' })
    .eq('id', storyId);
}

export async function dbUpdateStoryStatus(
  storyId: string,
  status: 'pending' | 'voting' | 'revealed' | 'done'
) {
  await supabase.from('stories').update({ status }).eq('id', storyId);
}

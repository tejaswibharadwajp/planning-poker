-- Run this in Supabase SQL Editor

create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  admin_id    text not null,           -- Clerk user ID
  created_at  timestamptz default now()
);

create table if not exists stories (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid references rooms(id) on delete cascade not null,
  title       text not null,
  description text,
  status      text not null default 'pending',  -- pending | voting | revealed | done
  estimate    text,
  created_at  timestamptz default now()
);

create table if not exists story_votes (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid references stories(id) on delete cascade not null,
  user_id     text not null,           -- Clerk user ID
  user_name   text not null,
  vote        text not null,
  created_at  timestamptz default now(),
  unique (story_id, user_id)
);

-- Row Level Security: server uses service role key so RLS not enforced server-side,
-- but enable it so direct client queries are safe
alter table rooms        enable row level security;
alter table stories      enable row level security;
alter table story_votes  enable row level security;

-- Allow service role full access (already implicit), expose read to anon for simplicity
-- Adjust policies per your security requirements
create policy "anyone can read rooms"   on rooms        for select using (true);
create policy "anyone can read stories" on stories      for select using (true);
create policy "anyone can read votes"   on story_votes  for select using (true);

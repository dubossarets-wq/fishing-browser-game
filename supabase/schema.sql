-- Run this once in the Supabase project's SQL editor (Database → SQL Editor → New query).
-- Creates the two tables the online layer needs: player profiles (for the
-- leaderboard/online list) and a global chat. Presence (who's online right
-- now) needs no table — it's a Realtime channel and works once Realtime is
-- enabled on the project (it is, by default).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Рыболов',
  level integer not null default 1,
  total_fish integer not null default 0,
  total_weight_kg numeric not null default 0,
  biggest_fish_species text,
  biggest_fish_weight numeric,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create table if not exists public.chat_messages (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "Chat messages are viewable by everyone"
  on public.chat_messages for select
  using (true);

create policy "Authenticated users can send messages"
  on public.chat_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Let Supabase Realtime stream new chat rows to connected clients.
alter publication supabase_realtime add table public.chat_messages;

-- Week Todo: Supabase에서 한 번만 실행하세요 (SQL Editor → New query → 붙여넣고 Run)
-- 나중에 다른 앱과 프로젝트를 합칠 수 있도록 테이블 이름에 todo_ 접두어를 사용합니다.

create table if not exists public.todo_tasks (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text        text not null default '',
  date        date,                      -- null 이면 백로그
  completed   boolean not null default false,
  color       text,                      -- 'yellow' (형광펜) 또는 null
  note        text,
  kind        text,                      -- today | meeting | release | deadline
  indent      smallint not null default 0, -- 1 이면 바로 위 할 일의 자식(들여쓰기)
  position    integer not null default 0,
  updated_at  timestamptz not null default now()
);

create index if not exists todo_tasks_user_position_idx on public.todo_tasks (user_id, position);

-- 행 단위 보안: 로그인한 "내" 데이터만 접근 가능
alter table public.todo_tasks enable row level security;

drop policy if exists "todo_tasks_select_own" on public.todo_tasks;
drop policy if exists "todo_tasks_insert_own" on public.todo_tasks;
drop policy if exists "todo_tasks_update_own" on public.todo_tasks;
drop policy if exists "todo_tasks_delete_own" on public.todo_tasks;

create policy "todo_tasks_select_own" on public.todo_tasks
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "todo_tasks_insert_own" on public.todo_tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "todo_tasks_update_own" on public.todo_tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "todo_tasks_delete_own" on public.todo_tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 로그인한 사용자에게만 권한 부여 (비로그인 anon 에게는 아무 권한도 주지 않음)
revoke all on public.todo_tasks from anon;
grant select, insert, update, delete on public.todo_tasks to authenticated;

-- updated_at 자동 갱신
create or replace function public.todo_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists todo_tasks_touch on public.todo_tasks;
create trigger todo_tasks_touch before update on public.todo_tasks
  for each row execute function public.todo_touch_updated_at();

-- 이미 테이블이 만들어져 있다면 아래 한 줄만 실행하세요 (들여쓰기 기능)
alter table public.todo_tasks add column if not exists indent smallint not null default 0;

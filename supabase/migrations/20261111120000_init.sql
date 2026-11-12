-- =============================================================================
-- Renotion: accounts, projects and sharing
--
-- Design notes
-- * A project is the unit of access. `project_members` holds who can do what;
--   every other table is reachable only through a project the caller belongs
--   to, enforced by Row Level Security on every table.
-- * Plans are stored as JSONB documents (one row per baseline / planned
--   plan): a floor plan is a document edited as a whole, never queried by its
--   walls, so a document column beats dozens of tables.
-- * Task status, expenses and price overrides are relational, because they
--   are the parts other features filter and aggregate.
-- * Saving goes through one function so a project is written in a single
--   transaction, guarded by an optimistic-concurrency `revision`.
-- * Nothing is exposed to the API by default: grants below are explicit.
-- =============================================================================

create schema if not exists private;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  units text not null default 'metric' check (units in ('metric', 'imperial')),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  start_date date,
  skip_weekends boolean not null default true,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_owner_recent on public.projects (owner_id, updated_at desc);

create table public.project_members (
  project_id uuid not null references public.projects on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user on public.project_members (user_id);

create table public.plan_versions (
  project_id uuid not null references public.projects on delete cascade,
  kind text not null check (kind in ('baseline', 'planned')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and data ? 'walls'),
  updated_at timestamptz not null default now(),
  primary key (project_id, kind)
);

create table public.cost_overrides (
  project_id uuid not null references public.projects on delete cascade,
  material_id text not null check (char_length(material_id) <= 120),
  cost_per_unit numeric(12, 2) not null check (cost_per_unit >= 0),
  primary key (project_id, material_id)
);

-- Tasks themselves are derived from the plans; only what the user changes is stored.
create table public.task_states (
  project_id uuid not null references public.projects on delete cascade,
  task_key text not null check (char_length(task_key) <= 200),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  duration_days numeric(6, 1) check (duration_days > 0),
  notes text check (char_length(notes) <= 2000),
  primary key (project_id, task_key)
);

create table public.expenses (
  project_id uuid not null references public.projects on delete cascade,
  id text not null check (char_length(id) <= 64),
  spent_on date not null,
  description text not null check (char_length(btrim(description)) between 1 and 200),
  category text not null check (
    category in (
      'flooring', 'tile', 'paint', 'trim', 'drywall', 'doors', 'windows', 'demolition',
      'furniture', 'wallFinish', 'ceiling', 'labour', 'other'
    )
  ),
  room_key text,
  amount numeric(12, 2) not null check (amount > 0),
  primary key (project_id, id)
);
create index expenses_by_date on public.expenses (project_id, spent_on desc);

-- Read-only links: whoever has the token can open a copy of the project.
create table public.project_shares (
  token uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index project_shares_project on public.project_shares (project_id);

-- -----------------------------------------------------------------------------
-- Access helpers (in a schema the API does not expose)
-- -----------------------------------------------------------------------------

-- The caller's role in a project, or null. SECURITY DEFINER so policies on
-- project_members can use it without recursing into themselves.
create function private.project_role(p_project uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.project_members m
  where m.project_id = p_project and m.user_id = (select auth.uid());
$$;

create function private.can_read(p_project uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select private.project_role(p_project) is not null; $$;

create function private.can_write(p_project uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(private.project_role(p_project) in ('owner', 'editor'), false); $$;

create function private.is_owner(p_project uuid)
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(private.project_role(p_project) = 'owner', false); $$;

grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Every new user gets a profile.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(split_part(coalesce(new.email, ''), '@', 1), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- The creator of a project becomes its owner member.
create function private.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute function private.add_owner_membership();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.plan_versions enable row level security;
alter table public.cost_overrides enable row level security;
alter table public.task_states enable row level security;
alter table public.expenses enable row level security;
alter table public.project_shares enable row level security;

-- Profiles: you see and edit only your own.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Projects: members read, owners/editors write, only owners delete.
create policy "projects: members read" on public.projects
  for select to authenticated using (private.can_read(id));
create policy "projects: create as yourself" on public.projects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "projects: editors update" on public.projects
  for update to authenticated using (private.can_write(id)) with check (private.can_write(id));
create policy "projects: owners delete" on public.projects
  for delete to authenticated using (private.is_owner(id));

-- Members: members see who else is on the project; only owners manage it.
create policy "members: members read" on public.project_members
  for select to authenticated using (private.can_read(project_id));
create policy "members: owners add" on public.project_members
  for insert to authenticated with check (private.is_owner(project_id));
create policy "members: owners change" on public.project_members
  for update to authenticated using (private.is_owner(project_id)) with check (private.is_owner(project_id));
create policy "members: owners remove" on public.project_members
  for delete to authenticated using (private.is_owner(project_id));

-- Project contents: members read, owners/editors write.
create policy "plans: members read" on public.plan_versions
  for select to authenticated using (private.can_read(project_id));
create policy "plans: editors write" on public.plan_versions
  for all to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));

create policy "overrides: members read" on public.cost_overrides
  for select to authenticated using (private.can_read(project_id));
create policy "overrides: editors write" on public.cost_overrides
  for all to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));

create policy "tasks: members read" on public.task_states
  for select to authenticated using (private.can_read(project_id));
create policy "tasks: editors write" on public.task_states
  for all to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));

create policy "expenses: members read" on public.expenses
  for select to authenticated using (private.can_read(project_id));
create policy "expenses: editors write" on public.expenses
  for all to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));

-- Share links: managed by owners only (opening one goes through a function).
create policy "shares: owners read" on public.project_shares
  for select to authenticated using (private.is_owner(project_id));
create policy "shares: owners create" on public.project_shares
  for insert to authenticated with check (private.is_owner(project_id) and created_by = (select auth.uid()));
create policy "shares: owners revoke" on public.project_shares
  for update to authenticated using (private.is_owner(project_id)) with check (private.is_owner(project_id));

-- -----------------------------------------------------------------------------
-- Functions the app calls
-- -----------------------------------------------------------------------------

-- A project as the JSON document the app uses (same shape as local storage).
create function private.project_json(p_project uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at,
    'revision', p.revision,
    'startDate', p.start_date,
    'skipWeekends', p.skip_weekends,
    'baseline', (select v.data from public.plan_versions v where v.project_id = p.id and v.kind = 'baseline'),
    'planned', (select v.data from public.plan_versions v where v.project_id = p.id and v.kind = 'planned'),
    'costOverrides', coalesce(
      (select jsonb_object_agg(o.material_id, o.cost_per_unit) from public.cost_overrides o where o.project_id = p.id),
      '{}'::jsonb
    ),
    'tasks', coalesce(
      (select jsonb_object_agg(
         t.task_key,
         jsonb_strip_nulls(jsonb_build_object('status', t.status, 'durationDays', t.duration_days, 'notes', t.notes))
       ) from public.task_states t where t.project_id = p.id),
      '{}'::jsonb
    ),
    'expenses', coalesce(
      (select jsonb_agg(jsonb_build_object(
         'id', e.id, 'spentOn', e.spent_on, 'description', e.description,
         'category', e.category, 'roomKey', e.room_key, 'amount', e.amount
       ) order by e.spent_on desc) from public.expenses e where e.project_id = p.id),
      '[]'::jsonb
    )
  )
  from public.projects p
  where p.id = p_project;
$$;

-- Load one project the caller can read (RLS applies: SECURITY INVOKER).
create function public.load_project(p_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$ select private.project_json(p.id) from public.projects p where p.id = p_id; $$;

-- The caller's projects, most recent first.
create function public.list_projects()
returns table (id uuid, name text, updated_at timestamptz, role text, wall_count integer)
language sql
stable
set search_path = ''
as $$
  select p.id, p.name, p.updated_at, m.role,
         coalesce(jsonb_array_length(v.data -> 'walls'), 0)
  from public.projects p
  join public.project_members m on m.project_id = p.id and m.user_id = (select auth.uid())
  left join public.plan_versions v on v.project_id = p.id and v.kind = 'baseline'
  order by p.updated_at desc;
$$;

-- Save a whole project in one transaction.
--   p_expected_revision omitted / null → create a new project
--   otherwise the stored revision must match, or nothing is written and a
--   'revision conflict' error (SQLSTATE 40001) is raised.
-- Returns the new revision. RLS applies (SECURITY INVOKER).
create function public.save_project(p_doc jsonb, p_expected_revision integer default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := (p_doc ->> 'id')::uuid;
  v_revision integer;
begin
  if p_expected_revision is null then
    -- No RETURNING: the row only becomes readable once the owner-membership
    -- trigger has run, after this statement.
    insert into public.projects (id, name, start_date, skip_weekends)
    values (
      v_id,
      coalesce(nullif(btrim(p_doc ->> 'name'), ''), 'Untitled project'),
      (p_doc ->> 'startDate')::date,
      coalesce((p_doc ->> 'skipWeekends')::boolean, true)
    );
    v_revision := 1;
  else
    update public.projects
    set name = coalesce(nullif(btrim(p_doc ->> 'name'), ''), 'Untitled project'),
        start_date = (p_doc ->> 'startDate')::date,
        skip_weekends = coalesce((p_doc ->> 'skipWeekends')::boolean, true),
        revision = revision + 1,
        updated_at = now()
    where id = v_id and revision = p_expected_revision
    returning revision into v_revision;

    if v_revision is null then
      if private.can_write(v_id) then
        raise exception 'revision conflict' using errcode = '40001';
      end if;
      raise exception 'project not found or not editable' using errcode = '42501';
    end if;
  end if;

  -- Plans (the planned plan is optional).
  insert into public.plan_versions (project_id, kind, data, updated_at)
  values (v_id, 'baseline', p_doc -> 'baseline', now())
  on conflict (project_id, kind) do update set data = excluded.data, updated_at = now();

  if jsonb_typeof(p_doc -> 'planned') = 'object' then
    insert into public.plan_versions (project_id, kind, data, updated_at)
    values (v_id, 'planned', p_doc -> 'planned', now())
    on conflict (project_id, kind) do update set data = excluded.data, updated_at = now();
  else
    delete from public.plan_versions where project_id = v_id and kind = 'planned';
  end if;

  -- Child collections are replaced wholesale (they are small).
  delete from public.cost_overrides where project_id = v_id;
  insert into public.cost_overrides (project_id, material_id, cost_per_unit)
  select v_id, o.key, o.value::numeric
  from jsonb_each_text(coalesce(p_doc -> 'costOverrides', '{}'::jsonb)) o;

  delete from public.task_states where project_id = v_id;
  insert into public.task_states (project_id, task_key, status, duration_days, notes)
  select v_id, t.key, t.value ->> 'status', (t.value ->> 'durationDays')::numeric, t.value ->> 'notes'
  from jsonb_each(coalesce(p_doc -> 'tasks', '{}'::jsonb)) t;

  delete from public.expenses where project_id = v_id;
  insert into public.expenses (project_id, id, spent_on, description, category, room_key, amount)
  select v_id, e ->> 'id', (e ->> 'spentOn')::date, e ->> 'description', e ->> 'category',
         e ->> 'roomKey', (e ->> 'amount')::numeric
  from jsonb_array_elements(coalesce(p_doc -> 'expenses', '[]'::jsonb)) e;

  return v_revision;
end;
$$;

-- Create (or reuse) a share link for a project you own.
create function public.share_project(p_project uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_token uuid;
begin
  select s.token into v_token
  from public.project_shares s
  where s.project_id = p_project and s.revoked_at is null
  limit 1;
  if v_token is null then
    insert into public.project_shares (project_id) values (p_project) returning token into v_token;
  end if;
  return v_token;
end;
$$;

-- Open a shared project by token. SECURITY DEFINER: the token is the
-- permission, so this works for anyone (signed in or not) who has the link.
create function public.shared_project(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.project_json(s.project_id) - 'revision'
  from public.project_shares s
  where s.token = p_token and s.revoked_at is null;
$$;

-- -----------------------------------------------------------------------------
-- Grants (new tables are not exposed automatically in this project)
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.plan_versions to authenticated;
grant select, insert, update, delete on public.cost_overrides to authenticated;
grant select, insert, update, delete on public.task_states to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update on public.project_shares to authenticated;

grant execute on function public.load_project(uuid) to authenticated;
grant execute on function public.list_projects() to authenticated;
grant execute on function public.save_project(jsonb, integer) to authenticated;
grant execute on function public.share_project(uuid) to authenticated;
grant execute on function public.shared_project(uuid) to anon, authenticated;

-- Functions are executable by PUBLIC by default; lock the private ones down
-- and allow only what policies and the API functions need.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.project_role(uuid) to authenticated;
grant execute on function private.can_read(uuid) to authenticated;
grant execute on function private.can_write(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
grant execute on function private.project_json(uuid) to authenticated;

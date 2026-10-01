-- Digital Amenities: ejecutar completo en SQL Editor de un proyecto Supabase nuevo.
-- Agrupa las tres migraciones iniciales; ejecutar una sola vez.
BEGIN;

-- 202609290001_academy.sql
-- Core schema. Monetary values are integer centavos; no client controls pricing.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null default '' check (length(full_name) <= 160),
  email text not null,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  role text not null default 'student' check (role in ('student','admin'))
);
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 180),
  subtitle text not null default '',
  description text not null default '',
  cover_url text,
  category text not null default 'Desarrollo',
  level text not null default 'Inicial',
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  instructor text not null default '',
  learning_outcomes text[] not null default '{}',
  requirements text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null check (length(title) between 1 and 180),
  position integer not null check (position >= 0),
  unique(id,course_id),
  constraint modules_position_unique unique(course_id,position) deferrable initially immediate
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null,
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null check (length(title) between 1 and 180),
  description text not null default '', -- Public syllabus copy, never private lesson content.
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  position integer not null check (position >= 0),
  is_preview boolean not null default false,
  foreign key (module_id,course_id) references public.modules(id,course_id) on delete restrict,
  constraint lessons_position_unique unique(module_id,position) deferrable initially immediate
);
create table public.lesson_videos (
  lesson_id uuid primary key references public.lessons(id) on delete restrict,
  stream_uid text not null unique,
  status text not null default 'pending' check (status in ('pending','processing','ready','error')),
  duration_seconds integer not null default 0 check (duration_seconds >= 0)
);
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  title text not null check (length(title) between 1 and 180),
  storage_path text not null unique check (storage_path !~ '(^/|\.\.)')
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  status text not null default 'pending' check (status in ('pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back','partial_refund','in_mediation')),
  created_at timestamptz not null default now(),
  reconciled_at timestamptz,
  reconcile_offset integer not null default 0 check (reconcile_offset >= 0)
);
create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  preference_id text unique,
  checkout_url text,
  status text not null default 'created' check (status in ('created','ready','failed','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider_payment_id text not null unique,
  status text not null check (status in ('pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back','partial_refund','in_mediation')),
  amount_cents integer not null check (amount_cents > 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0 and refunded_cents <= amount_cents),
  currency text not null check (currency = 'ARS'),
  provider_updated_at timestamptz not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  source text not null check (source in ('payment','manual')),
  payment_id uuid unique references public.payments(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked')),
  reason text not null,
  created_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((source = 'payment' and payment_id is not null) or (source = 'manual' and payment_id is null)),
  check ((status = 'active' and revoked_at is null) or (status = 'revoked' and revoked_at is not null))
);
create unique index one_active_manual_grant on public.access_grants(user_id,course_id) where source = 'manual' and status = 'active';
create table public.progress (
  user_id uuid not null references public.profiles(id) on delete restrict,
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id,lesson_id)
);
create table public.payment_events (
  event_key text primary key,
  order_id uuid references public.orders(id) on delete restrict,
  provider_payment_id text,
  event_type text not null default 'payment',
  outcome text not null,
  payload jsonb not null default '{}', -- Redacted diagnostic fields only.
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index courses_catalog_idx on public.courses(status,featured,category);
create index lessons_course_idx on public.lessons(course_id);
create index resources_lesson_idx on public.resources(lesson_id);
create index orders_user_idx on public.orders(user_id,created_at desc);
create index orders_course_idx on public.orders(course_id);
create index orders_reconcile_idx on public.orders(reconciled_at nulls first,created_at);
create index attempts_order_idx on public.payment_attempts(order_id,created_at desc);
create index payments_order_idx on public.payments(order_id);
create index payments_approved_idx on public.payments(approved_at) where approved_at is not null;
create index grants_lookup_idx on public.access_grants(user_id,course_id,status);
create index grants_course_idx on public.access_grants(course_id,status);
create index progress_lesson_idx on public.progress(lesson_id);
create index events_order_idx on public.payment_events(order_id,created_at desc);
create index audit_actor_idx on public.audit_logs(actor_id,created_at desc);

-- Roles never come from raw_user_meta_data. All new accounts are students.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name,email)
  values (new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),160),coalesce(new.email,''));
  insert into public.user_roles(user_id,role) values (new.id,'student');
  return new;
end; $$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.sync_auth_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email,'') where id = new.id;
  return new;
end; $$;
revoke all on function public.sync_auth_email() from public,anon,authenticated;
create trigger on_auth_email_updated after update of email on auth.users for each row execute function public.sync_auth_email();

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin');
$$;
create function public.has_course_access(p_course_id uuid,p_user_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user_id is not null
    and (p_user_id = (select auth.uid()) or (select auth.role()) = 'service_role' or public.is_admin())
    and exists(select 1 from public.courses c where c.id = p_course_id and c.status in ('published','archived'))
    and exists(select 1 from public.access_grants g where g.user_id = p_user_id and g.course_id = p_course_id and g.status = 'active');
$$;
revoke all on function public.is_admin(),public.has_course_access(uuid,uuid) from public;
grant execute on function public.is_admin(),public.has_course_access(uuid,uuid) to anon,authenticated,service_role;

create function public.touch_progress() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
revoke all on function public.touch_progress() from public,anon,authenticated;
create trigger progress_updated before update on public.progress for each row execute function public.touch_progress();

-- Financial snapshots stay immutable even for a misbehaving backend write.
create function public.protect_order_snapshot() returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.id,new.user_id,new.course_id,new.amount_cents,new.currency,new.created_at)
    is distinct from (old.id,old.user_id,old.course_id,old.amount_cents,old.currency,old.created_at) then
    raise exception 'Order snapshot is immutable' using errcode = '23514';
  end if;
  return new;
end; $$;
revoke all on function public.protect_order_snapshot() from public,anon,authenticated;
create trigger order_snapshot_immutable before update on public.orders for each row execute function public.protect_order_snapshot();

create function public.protect_sold_content() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_course_id uuid;
begin
  if tg_table_name = 'courses' then v_course_id := old.id;
  elsif tg_table_name in ('modules','lessons') then v_course_id := old.course_id;
  else select l.course_id into v_course_id from public.lessons l where l.id = old.lesson_id;
  end if;
  if exists(select 1 from public.access_grants where course_id = v_course_id)
    or exists(select 1 from public.orders where course_id = v_course_id) then
    raise exception 'Content with purchases or grants must be archived, not deleted' using errcode = '23514';
  end if;
  return old;
end; $$;
revoke all on function public.protect_sold_content() from public,anon,authenticated;
create trigger protect_course_delete before delete on public.courses for each row execute function public.protect_sold_content();
create trigger protect_module_delete before delete on public.modules for each row execute function public.protect_sold_content();
create trigger protect_lesson_delete before delete on public.lessons for each row execute function public.protect_sold_content();
create trigger protect_video_delete before delete on public.lesson_videos for each row execute function public.protect_sold_content();
create trigger protect_resource_delete before delete on public.resources for each row execute function public.protect_sold_content();

-- Both SQL grants and RLS are explicit; never inherit Supabase legacy defaults.
do $$ declare t text; begin
  foreach t in array array['profiles','user_roles','courses','modules','lessons','lesson_videos','resources','orders','payment_attempts','payments','access_grants','progress','payment_events','audit_logs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon, authenticated',t);
    execute format('grant all on table public.%I to service_role',t);
  end loop;
end $$;
grant select on public.courses,public.modules,public.lessons to anon,authenticated;
grant insert,update,delete on public.courses,public.modules,public.lessons to authenticated;
grant select on public.profiles,public.user_roles,public.orders,public.payment_attempts,public.payments,public.access_grants,public.payment_events,public.audit_logs to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant select,insert,update,delete on public.lesson_videos,public.resources to authenticated;
grant select,insert,update on public.progress to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy profiles_update_name on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy courses_read on public.courses for select to anon,authenticated using (status = 'published' or (select public.is_admin()) or (status = 'archived' and public.has_course_access(id)));
create policy modules_read on public.modules for select to anon,authenticated using (exists(select 1 from public.courses c where c.id = course_id));
create policy lessons_read on public.lessons for select to anon,authenticated using (exists(select 1 from public.courses c where c.id = course_id));
do $$ declare t text; begin
  foreach t in array array['courses','modules','lessons','lesson_videos','resources'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.is_admin()))',t||'_admin_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t||'_admin_update',t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.is_admin()))',t||'_admin_delete',t);
  end loop;
end $$;
-- Even paying students cannot query raw Stream IDs. Playback endpoint signs after authorization.
create policy videos_admin_read on public.lesson_videos for select to authenticated using ((select public.is_admin()));
create policy resources_authorized_read on public.resources for select to authenticated using ((select public.is_admin()) or exists(select 1 from public.lessons l where l.id = lesson_id and public.has_course_access(l.course_id)));
create policy orders_read on public.orders for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy attempts_read on public.payment_attempts for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id));
create policy payments_read on public.payments for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id));
create policy grants_read on public.access_grants for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy progress_read on public.progress for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy progress_insert on public.progress for insert to authenticated with check (user_id = (select auth.uid()) and exists(select 1 from public.lessons l where l.id = lesson_id and public.has_course_access(l.course_id)));
create policy progress_update on public.progress for update to authenticated using (user_id = (select auth.uid()) and exists(select 1 from public.lessons l where l.id = lesson_id and public.has_course_access(l.course_id))) with check (user_id = (select auth.uid()) and exists(select 1 from public.lessons l where l.id = lesson_id and public.has_course_access(l.course_id)));
create policy events_admin_read on public.payment_events for select to authenticated using ((select public.is_admin()));
create policy audit_admin_read on public.audit_logs for select to authenticated using ((select public.is_admin()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('course-covers','course-covers',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
  ('course-materials','course-materials',false,52428800,array['application/pdf','application/zip','text/plain','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy academy_storage_admin_read on storage.objects for select to authenticated using (bucket_id in ('course-covers','course-materials') and (select public.is_admin()));
create policy academy_storage_admin_insert on storage.objects for insert to authenticated with check (bucket_id in ('course-covers','course-materials') and (select public.is_admin()));
create policy academy_storage_admin_update on storage.objects for update to authenticated using (bucket_id in ('course-covers','course-materials') and (select public.is_admin())) with check (bucket_id in ('course-covers','course-materials') and (select public.is_admin()));
-- No Storage delete policy: preserve sold materials. Private downloads use a checked backend signer.


-- 202609290002_transactions.sql
-- Privileged business operations. Only the server service role may invoke these.
create function public.create_checkout_order(p_user_id uuid,p_course_id uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare v_course public.courses; v_order public.orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_course_id::text,0));
  if exists(select 1 from public.access_grants where user_id=p_user_id and course_id=p_course_id and status='active') then
    raise exception 'Course already accessible' using errcode='23514';
  end if;
  select * into v_course from public.courses where id=p_course_id and status='published' for share;
  if not found then raise exception 'Course unavailable' using errcode='P0002'; end if;
  select * into v_order from public.orders where user_id=p_user_id and course_id=p_course_id and status in ('pending','in_process','authorized') order by created_at desc limit 1 for update;
  if found then return v_order; end if;
  insert into public.orders(user_id,course_id,amount_cents,currency) values(p_user_id,p_course_id,v_course.price_cents,v_course.currency) returning * into v_order;
  return v_order;
end; $$;

create function public.reserve_checkout_attempt(p_order_id uuid,p_attempt_id uuid default gen_random_uuid()) returns public.payment_attempts
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_attempt public.payment_attempts;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if v_order.status not in ('pending','in_process','authorized') then raise exception 'Order cannot receive checkout' using errcode='23514'; end if;
  if exists(select 1 from public.access_grants where user_id=v_order.user_id and course_id=v_order.course_id and status='active') then
    raise exception 'Course already accessible' using errcode='23514';
  end if;
  select * into v_attempt from public.payment_attempts where order_id=p_order_id
    and ((status='ready' and expires_at>now()) or (status='created' and created_at>now()-interval '2 minutes'))
    order by created_at desc limit 1;
  if found then return v_attempt; end if;
  update public.payment_attempts set status='expired' where order_id=p_order_id and status in ('created','ready');
  insert into public.payment_attempts(id,order_id) values(p_attempt_id,p_order_id) returning * into v_attempt;
  return v_attempt;
end; $$;

create function public.apply_verified_payment(
  p_order_id uuid,p_provider_payment_id text,p_status text,p_amount_cents integer,p_refunded_cents integer,
  p_currency text,p_provider_updated_at timestamptz,p_approved_at timestamptz,p_event_key text,p_payload jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_payment public.payments; v_status text; v_event_inserted integer; v_reason text;
begin
  -- Signature + live provider GET + collector + reference verification belongs to backend.
  -- Amount/currency/reference-to-existing-payment are rechecked inside this transaction.
  if p_provider_payment_id is null or length(p_provider_payment_id)=0 or p_provider_updated_at is null or p_event_key is null or length(p_event_key)=0 then
    raise exception 'Missing verified payment identity' using errcode='23514';
  end if;
  if p_status not in ('pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back','partial_refund','in_mediation') or p_status is null then
    raise exception 'Unsupported payment status' using errcode='23514';
  end if;
  -- Serialize first insertion even if two backend requests name different orders.
  -- The unique provider key alone cannot make a pre-upsert ownership check atomic.
  perform pg_advisory_xact_lock(hashtextextended('payment:'||p_provider_payment_id,0));
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found' using errcode='P0002'; end if;
  if p_amount_cents is distinct from v_order.amount_cents or p_currency is distinct from v_order.currency
    or p_refunded_cents is null or p_refunded_cents<0 or p_refunded_cents>p_amount_cents then
    raise exception 'Verified payment does not match order snapshot' using errcode='23514';
  end if;
  insert into public.payment_events(event_key,order_id,provider_payment_id,event_type,outcome,payload)
    values(p_event_key,p_order_id,p_provider_payment_id,'verified_payment','received',coalesce(p_payload,'{}')) on conflict(event_key) do nothing;
  get diagnostics v_event_inserted = row_count;
  if v_event_inserted=0 then return jsonb_build_object('applied',false,'order_id',p_order_id,'reason','duplicate'); end if;
  select * into v_payment from public.payments where provider_payment_id=p_provider_payment_id for update;
  if found and v_payment.order_id<>p_order_id then raise exception 'Payment already belongs to another order' using errcode='23514'; end if;
  v_status := case when p_status in ('charged_back','in_mediation') then p_status when p_refunded_cents=p_amount_cents or p_status='refunded' then 'refunded' when p_refunded_cents>0 or p_status='partial_refund' then 'partial_refund' else p_status end;
  if v_payment.id is not null then
    if p_provider_updated_at<v_payment.provider_updated_at then v_reason:='stale';
    elsif v_payment.status in ('refunded','charged_back','partial_refund') and v_status not in ('refunded','charged_back','partial_refund') then v_reason:='terminal';
    elsif v_payment.status='approved' and v_status in ('pending','in_process','authorized','rejected','cancelled') then v_reason:='regression';
    elsif p_provider_updated_at=v_payment.provider_updated_at and v_payment.status='in_mediation' and v_status not in ('in_mediation','refunded','charged_back','partial_refund') then v_reason:='same_version';
    end if;
    if v_reason is not null then
      update public.payment_events set outcome=v_reason where event_key=p_event_key;
      return jsonb_build_object('applied',false,'payment_id',v_payment.id,'order_id',p_order_id,'status',v_payment.status,'reason',v_reason);
    end if;
    -- Refund totals are monotonic. Preserve a full refund even if a subsequent
    -- provider snapshot reports a smaller refunded amount with an adverse status.
    if v_status not in ('charged_back','in_mediation') and v_payment.refunded_cents=p_amount_cents then
      v_status := 'refunded';
    end if;
  end if;
  insert into public.payments(order_id,provider_payment_id,status,amount_cents,refunded_cents,currency,provider_updated_at,approved_at)
    values(p_order_id,p_provider_payment_id,v_status,p_amount_cents,p_refunded_cents,p_currency,p_provider_updated_at,
      case when v_status='approved' then coalesce(p_approved_at,p_provider_updated_at) else p_approved_at end)
    on conflict(provider_payment_id) do update set
      status=excluded.status,refunded_cents=greatest(public.payments.refunded_cents,excluded.refunded_cents),
      provider_updated_at=excluded.provider_updated_at,approved_at=coalesce(public.payments.approved_at,excluded.approved_at)
    returning * into v_payment;
  if v_status='approved' then
    insert into public.access_grants(user_id,course_id,source,payment_id,status,reason)
      values(v_order.user_id,v_order.course_id,'payment',v_payment.id,'active','Pago verificado por Mercado Pago')
      on conflict(payment_id) do update set status='active',revoked_at=null,reason=excluded.reason;
  else
    update public.access_grants set status='revoked',revoked_at=coalesce(revoked_at,now()),reason='Estado del pago: '||v_status
      where payment_id=v_payment.id and status='active';
  end if;
  -- A failed retry cannot hide another independently approved payment on this order.
  update public.orders set status=case when exists(select 1 from public.payments where order_id=p_order_id and status='approved') then 'approved' else v_status end,reconciled_at=now() where id=p_order_id;
  update public.payment_events set outcome=case when v_status='partial_refund' then 'applied_review_required' else 'applied' end where event_key=p_event_key;
  return jsonb_build_object('applied',true,'payment_id',v_payment.id,'order_id',p_order_id,'status',v_status);
end; $$;

create function public.grant_manual_access(p_actor_id uuid,p_user_id uuid,p_course_id uuid,p_reason text) returns public.access_grants
language plpgsql security definer set search_path = '' as $$
declare v_grant public.access_grants;
begin
  if not exists(select 1 from public.user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason))<5 or length(p_reason)>1000 then raise exception 'A reason of 5–1000 characters is required' using errcode='23514'; end if;
  if not exists(select 1 from public.courses where id=p_course_id and status in ('published','archived')) then raise exception 'Course must be published or archived' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_course_id::text,0));
  insert into public.access_grants(user_id,course_id,source,status,reason,created_by)
    values(p_user_id,p_course_id,'manual','active',trim(p_reason),p_actor_id)
    on conflict(user_id,course_id) where source='manual' and status='active' do update set reason=excluded.reason
    returning * into v_grant;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(p_actor_id,'manual_access_granted','access_grant',v_grant.id,jsonb_build_object('user_id',p_user_id,'course_id',p_course_id,'reason',trim(p_reason)));
  return v_grant;
end; $$;

create function public.revoke_manual_access(p_actor_id uuid,p_grant_id uuid,p_reason text) returns public.access_grants
language plpgsql security definer set search_path = '' as $$
declare v_grant public.access_grants;
begin
  if not exists(select 1 from public.user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator required' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason))<5 or length(p_reason)>1000 then raise exception 'A reason of 5–1000 characters is required' using errcode='23514'; end if;
  update public.access_grants set status='revoked',revoked_at=coalesce(revoked_at,now()),reason=trim(p_reason) where id=p_grant_id and source='manual' returning * into v_grant;
  if not found then raise exception 'Manual grant not found' using errcode='P0002'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details)
    values(p_actor_id,'manual_access_revoked','access_grant',v_grant.id,jsonb_build_object('user_id',v_grant.user_id,'course_id',v_grant.course_id,'reason',trim(p_reason)));
  return v_grant;
end; $$;

create function public.reorder_course_content(p_actor_id uuid,p_course_id uuid,p_kind text,p_ids uuid[],p_module_id uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_expected uuid[]; v_sorted uuid[];
begin
  if not exists(select 1 from public.user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator required' using errcode='42501'; end if;
  perform 1 from public.courses where id=p_course_id for update;
  if not found then raise exception 'Course not found' using errcode='P0002'; end if;
  if p_ids is null or array_position(p_ids,null) is not null then raise exception 'Invalid content IDs' using errcode='23514'; end if;
  select array_agg(id order by id) into v_sorted from unnest(p_ids) id;
  if p_kind='modules' then
    select array_agg(id order by id) into v_expected from public.modules where course_id=p_course_id;
  elsif p_kind='lessons' and p_module_id is not null then
    select array_agg(id order by id) into v_expected from public.lessons where course_id=p_course_id and module_id=p_module_id;
  else raise exception 'Unsupported content kind' using errcode='23514'; end if;
  if coalesce(v_sorted,'{}') is distinct from coalesce(v_expected,'{}') then raise exception 'IDs must contain every item once' using errcode='23514'; end if;
  set constraints public.modules_position_unique,public.lessons_position_unique deferred;
  if p_kind='modules' then
    update public.modules m set position=x.ordinality-1 from unnest(p_ids) with ordinality x(id,ordinality) where m.id=x.id;
  else
    update public.lessons l set position=x.ordinality-1 from unnest(p_ids) with ordinality x(id,ordinality) where l.id=x.id;
  end if;
  set constraints public.modules_position_unique,public.lessons_position_unique immediate;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(p_actor_id,'content_reordered','course',p_course_id,jsonb_build_object('kind',p_kind,'ids',p_ids));
end; $$;

create function public.bootstrap_first_admin(p_email text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('academy:first_admin',0));
  if exists(select 1 from public.user_roles where role='admin') then raise exception 'An administrator already exists' using errcode='23514'; end if;
  select id into v_user_id from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
  if v_user_id is null then raise exception 'Register and verify the administrator email first' using errcode='P0002'; end if;
  update public.user_roles set role='admin' where user_id=v_user_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,details) values(v_user_id,'first_admin_bootstrapped','profile',v_user_id,jsonb_build_object('email',lower(trim(p_email))));
  return v_user_id;
end; $$;

revoke all on function public.create_checkout_order(uuid,uuid),public.reserve_checkout_attempt(uuid,uuid),public.apply_verified_payment(uuid,text,text,integer,integer,text,timestamptz,timestamptz,text,jsonb),public.grant_manual_access(uuid,uuid,uuid,text),public.revoke_manual_access(uuid,uuid,text),public.reorder_course_content(uuid,uuid,text,uuid[],uuid),public.bootstrap_first_admin(text) from public,anon,authenticated;
grant execute on function public.create_checkout_order(uuid,uuid),public.reserve_checkout_attempt(uuid,uuid),public.apply_verified_payment(uuid,text,text,integer,integer,text,timestamptz,timestamptz,text,jsonb),public.grant_manual_access(uuid,uuid,uuid,text),public.revoke_manual_access(uuid,uuid,text),public.reorder_course_content(uuid,uuid,text,uuid[],uuid),public.bootstrap_first_admin(text) to service_role;


-- 202609290003_progress.sql
-- Atomic progress saves: an older autosave must never undo lesson completion.
create function public.save_lesson_progress(p_lesson_id uuid,p_position_seconds integer,p_completed boolean default false)
returns public.progress language plpgsql security invoker set search_path = '' as $$
declare v_lesson public.lessons; v_progress public.progress;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into v_lesson from public.lessons where id=p_lesson_id;
  if not found or not public.has_course_access(v_lesson.course_id) then
    raise exception 'Course access required' using errcode='42501';
  end if;
  if p_position_seconds is null or p_position_seconds < 0 or p_position_seconds > 360000 then
    raise exception 'Invalid progress position' using errcode='23514';
  end if;
  insert into public.progress(user_id,lesson_id,position_seconds,completed)
    values(auth.uid(),p_lesson_id,least(p_position_seconds,case when v_lesson.duration_seconds>0 then v_lesson.duration_seconds else 360000 end),coalesce(p_completed,false))
    on conflict(user_id,lesson_id) do update set position_seconds=excluded.position_seconds,
      completed=public.progress.completed or excluded.completed
    returning * into v_progress;
  return v_progress;
end; $$;
revoke all on function public.save_lesson_progress(uuid,integer,boolean) from public,anon;
grant execute on function public.save_lesson_progress(uuid,integer,boolean) to authenticated;


COMMIT;

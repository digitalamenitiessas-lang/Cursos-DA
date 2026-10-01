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

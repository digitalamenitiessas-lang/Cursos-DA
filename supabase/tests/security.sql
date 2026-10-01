-- Real SQL integration assertions. Run after migrations against a disposable database:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
-- All fixtures and helper functions are rolled back. No external extensions required.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert(p_ok boolean,p_message text) returns void language plpgsql as $$
begin if p_ok is distinct from true then raise exception 'FAIL: %',p_message; end if; raise notice 'PASS: %',p_message; end; $$;
create function pg_temp.assert_error(p_statement text,p_code text,p_message text) returns void language plpgsql as $$
begin
  begin execute p_statement;
  exception when others then
    if sqlstate=p_code then raise notice 'PASS: %',p_message; return; end if;
    raise exception 'FAIL: % — expected %, received %: %',p_message,p_code,sqlstate,sqlerrm;
  end;
  raise exception 'FAIL: % — statement unexpectedly succeeded',p_message;
end; $$;

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001','security-student@example.invalid',now(),'{"full_name":"Student","role":"admin"}'),
 ('10000000-0000-0000-0000-000000000002','security-other@example.invalid',now(),'{}'),
 ('10000000-0000-0000-0000-000000000003','security-admin@example.invalid',now(),'{}');
update public.user_roles set role='admin' where user_id='10000000-0000-0000-0000-000000000003';
insert into public.courses(id,slug,title,price_cents,status) values
 ('20000000-0000-0000-0000-000000000001','test-published','Test published',10000,'published'),
 ('20000000-0000-0000-0000-000000000002','test-draft','Test draft',10000,'draft'),
 ('20000000-0000-0000-0000-000000000003','test-archived','Test archived',10000,'archived');
insert into public.modules(id,course_id,title,position) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Module',0),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Draft module',0),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','Module two',1);
insert into public.lessons(id,module_id,course_id,title,position) values
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Private lesson',0),
 ('40000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Draft lesson',0);
insert into public.lesson_videos(lesson_id,stream_uid,status) values('40000000-0000-0000-0000-000000000001','private-stream-id','ready');
insert into public.resources(lesson_id,title,storage_path) values('40000000-0000-0000-0000-000000000001','Private PDF','test/private.pdf');
insert into storage.objects(bucket_id,name) values('course-materials','test/private.pdf');
insert into public.orders(id,user_id,course_id,amount_cents) values
 ('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',10000),
 ('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',10000);

set local role anon;
select set_config('request.jwt.claim.role','anon',true);
select pg_temp.assert((select count(*) from public.courses where id::text like '20000000-%')=1,'anon sees published course only');
select pg_temp.assert((select count(*) from public.lessons where id::text like '40000000-%')=1,'anon sees published syllabus only');
select pg_temp.assert_error('select * from public.lesson_videos','42501','anon cannot read Stream IDs');
select pg_temp.assert_error('select * from public.resources','42501','anon cannot read resource paths');
select pg_temp.assert_error('select * from public.profiles','42501','anon cannot read profiles');
select pg_temp.assert_error('insert into public.courses(slug,title,price_cents) values (''x'',''x'',1)','42501','anon cannot create courses');
select pg_temp.assert((select count(*) from storage.objects where name='test/private.pdf')=0,'private Storage object hidden from anon');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.assert(not public.is_admin(),'registration metadata cannot assign admin');
select pg_temp.assert((select count(*) from public.profiles where id::text like '10000000-%')=1,'student sees only own profile');
select pg_temp.assert((select count(*) from public.orders where id::text like '50000000-%')=1,'student sees only own orders');
select pg_temp.assert((select count(*) from public.lesson_videos)=0,'unpaid student cannot query video credentials');
select pg_temp.assert((select count(*) from public.resources)=0,'unpaid student cannot read resources');
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001'),'unpaid student has no access');
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'student cannot probe another user access');
update public.profiles set full_name='Allowed name' where id='10000000-0000-0000-0000-000000000001';
select pg_temp.assert((select full_name from public.profiles where id='10000000-0000-0000-0000-000000000001')='Allowed name','student can change own name');
select pg_temp.assert_error('update public.profiles set email=''hacked@example.invalid''','42501','profile email immutable to client');
select pg_temp.assert_error('update public.profiles set id=gen_random_uuid()','42501','profile ID immutable to client');
select pg_temp.assert_error('update public.user_roles set role=''admin''','42501','student cannot change role');
select pg_temp.assert_error('insert into public.access_grants(user_id,course_id,source,reason) values (auth.uid(),''20000000-0000-0000-0000-000000000001'',''manual'',''hacked'')','42501','student cannot grant access');
select pg_temp.assert_error('update public.payments set status=''approved''','42501','student cannot approve payments');
select pg_temp.assert_error('select public.create_checkout_order(auth.uid(),''20000000-0000-0000-0000-000000000001'')','42501','privileged checkout RPC inaccessible to browser');
select pg_temp.assert_error($q$select public.apply_verified_payment('50000000-0000-0000-0000-000000000001','forged','approved',10000,0,'ARS',now(),now(),'forged')$q$,'42501','student cannot invoke payment verification RPC');
select pg_temp.assert_error('select public.bootstrap_first_admin(''security-student@example.invalid'')','42501','bootstrap RPC inaccessible to browser');
select pg_temp.assert_error('insert into public.progress(user_id,lesson_id) values (auth.uid(),''40000000-0000-0000-0000-000000000001'')','42501','unpaid student cannot write progress');
update public.courses set price_cents=1 where id='20000000-0000-0000-0000-000000000001';
select pg_temp.assert((select price_cents from public.courses where id='20000000-0000-0000-0000-000000000001')=10000,'student cannot alter price through direct API');
select pg_temp.assert((select count(*) from storage.objects where name='test/private.pdf')=0,'private Storage cannot be downloaded directly');
select pg_temp.assert_error('insert into storage.objects(bucket_id,name) values (''course-covers'',''hacked.png'')','42501','student cannot upload course covers');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select pg_temp.assert((public.create_checkout_order('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001')).id='50000000-0000-0000-0000-000000000001','checkout reuses pending order snapshot');
select pg_temp.assert((public.reserve_checkout_attempt('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001')).id='60000000-0000-0000-0000-000000000001','first checkout attempt claims supplied ID');
select pg_temp.assert((public.reserve_checkout_attempt('50000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002')).id='60000000-0000-0000-0000-000000000001','concurrent checkout sees same in-flight attempt');
select pg_temp.assert_error($q$select public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','approved',1,0,'ARS','2026-09-29T10:00:00Z',null,'wrong-amount')$q$,'23514','tampered amount rejected transactionally');
select pg_temp.assert_error($q$select public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','approved',10000,0,'USD','2026-09-29T10:00:00Z',null,'wrong-currency')$q$,'23514','tampered currency rejected transactionally');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','pending',10000,0,'ARS','2026-09-29T10:00:00Z',null,'test-pending');
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),'pending payment does not unlock');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','approved',10000,0,'ARS','2026-09-29T11:00:00Z','2026-09-29T11:00:00Z','test-approved');
select pg_temp.assert(public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),'pending then approved unlocks course');
select pg_temp.assert((public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','approved',10000,0,'ARS','2026-09-29T11:00:00Z','2026-09-29T11:00:00Z','test-approved')->>'applied')='false','duplicate event is idempotent');
select pg_temp.assert((public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','pending',10000,0,'ARS','2026-09-29T10:00:00Z',null,'test-stale')->>'reason')='stale','out-of-order event ignored');
select pg_temp.assert((select count(*) from public.access_grants where user_id='10000000-0000-0000-0000-000000000001')=1,'duplicate events do not duplicate access');
select pg_temp.assert((select count(*) from public.payments where provider_payment_id='test-pay-1')=1,'duplicate events do not duplicate sales');
select pg_temp.assert_error($q$select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-1','approved',10000,0,'ARS','2026-09-29T12:00:00Z',null,'wrong-reference')$q$,'23514','provider payment cannot move to another order');
select pg_temp.assert_error($q$select public.create_checkout_order('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001')$q$,'23514','second purchase prevented while access exists');
update public.courses set status='archived' where id='20000000-0000-0000-0000-000000000001';
select pg_temp.assert_error($q$delete from public.lessons where id='40000000-0000-0000-0000-000000000001'$q$,'23514','sold lesson cannot be deleted');
select pg_temp.assert_error($q$update public.orders set amount_cents=1 where id='50000000-0000-0000-0000-000000000001'$q$,'23514','order price snapshot immutable even on backend');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select pg_temp.assert((select count(*) from public.courses where id='20000000-0000-0000-0000-000000000001')=1,'buyer retains archived course');
select pg_temp.assert((select count(*) from public.resources where storage_path='test/private.pdf')=1,'buyer sees authorized resource metadata');
select pg_temp.assert((select count(*) from public.lesson_videos)=0,'even buyer cannot retrieve raw video identifiers');
select pg_temp.assert((select count(*) from storage.objects where name='test/private.pdf')=0,'buyer still needs backend signed material URL');
insert into public.progress(user_id,lesson_id,position_seconds,completed) values(auth.uid(),'40000000-0000-0000-0000-000000000001',42,true);
select pg_temp.assert((select position_seconds from public.progress where lesson_id='40000000-0000-0000-0000-000000000001')=42,'authorized progress persists');
select public.save_lesson_progress('40000000-0000-0000-0000-000000000001',45,false);
select pg_temp.assert((select completed and position_seconds=45 from public.progress where lesson_id='40000000-0000-0000-0000-000000000001'),'autosave preserves previously completed lesson atomically');
select pg_temp.assert_error($q$select public.save_lesson_progress('40000000-0000-0000-0000-000000000001',-1,false)$q$,'23514','negative progress rejected');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.assert((select count(*) from public.courses where id='20000000-0000-0000-0000-000000000001')=0,'unpaid student cannot read archived course');
select pg_temp.assert((select count(*) from public.progress)=0,'other student cannot read progress');
select pg_temp.assert_error($q$select public.save_lesson_progress('40000000-0000-0000-0000-000000000001',20,true)$q$,'42501','progress RPC cannot bypass access or impersonate a buyer');
select pg_temp.assert_error('insert into public.progress(user_id,lesson_id) values (''10000000-0000-0000-0000-000000000001'',''40000000-0000-0000-0000-000000000001'')','42501','other student cannot write buyer progress');

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.grant_manual_access('10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Beca independiente');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','refunded',10000,10000,'ARS','2026-09-29T12:00:00Z','2026-09-29T11:00:00Z','test-refunded');
select pg_temp.assert((select status from public.access_grants where source='payment' and user_id='10000000-0000-0000-0000-000000000001')='revoked','refund revokes originating payment grant');
select pg_temp.assert(public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),'refund preserves independent manual grant');
select pg_temp.assert((public.apply_verified_payment('50000000-0000-0000-0000-000000000001','test-pay-1','approved',10000,0,'ARS','2026-09-29T13:00:00Z','2026-09-29T11:00:00Z','test-resurrection')->>'reason')='terminal','terminal refund cannot resurrect access');
select public.revoke_manual_access('10000000-0000-0000-0000-000000000003',id,'Fin de la beca') from public.access_grants where source='manual' and user_id='10000000-0000-0000-0000-000000000001';
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),'access ends once all independent grants revoked');
select pg_temp.assert((select count(*) from public.audit_logs where actor_id='10000000-0000-0000-0000-000000000003')=2,'manual grant and revoke create atomic audits');
select pg_temp.assert_error($q$select public.grant_manual_access('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Pretend admin')$q$,'42501','server RPC independently validates administrator actor');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-2','approved',10000,0,'ARS','2026-09-29T11:00:00Z',null,'test-second-approved');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-2','charged_back',10000,0,'ARS','2026-09-29T12:00:00Z',null,'test-chargeback');
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'chargeback revokes payment access');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-3','approved',10000,0,'ARS','2026-09-29T11:00:00Z',null,'test-third-approved');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-3','approved',10000,2000,'ARS','2026-09-29T12:00:00Z',null,'test-partial-refund');
select pg_temp.assert((select outcome from public.payment_events where event_key='test-partial-refund')='applied_review_required','partial refund explicitly flags administrator review');
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'partial refund suspends originating access');
select pg_temp.assert((public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-3','approved',10000,0,'ARS','2026-09-29T13:00:00Z',null,'test-partial-resurrection')->>'reason')='terminal','partial refund cannot be undone by late approval');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-4','approved',10000,0,'ARS','2026-09-29T11:00:00Z',null,'test-fourth-approved');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-4','in_mediation',10000,0,'ARS','2026-09-29T12:00:00Z',null,'test-dispute');
select pg_temp.assert(not public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'mediation suspends that payment access');
select pg_temp.assert((public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-4','approved',10000,0,'ARS','2026-09-29T12:00:00Z',null,'test-dispute-same-time')->>'reason')='same_version','same-time approval cannot override mediation');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-4','approved',10000,0,'ARS','2026-09-29T13:00:00Z',null,'test-dispute-resolved');
select pg_temp.assert(public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'newer favorable dispute resolution restores that access');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-5','approved',10000,0,'ARS','2026-09-29T11:00:00Z',null,'test-fifth-approved');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-5','refunded',10000,10000,'ARS','2026-09-29T12:00:00Z',null,'test-fifth-refund');
select pg_temp.assert(public.has_course_access('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002'),'refund preserves a separate valid payment grant');
select public.apply_verified_payment('50000000-0000-0000-0000-000000000002','test-pay-5','approved',10000,1000,'ARS','2026-09-29T13:00:00Z',null,'test-lower-refund');
select pg_temp.assert((select status='refunded' and refunded_cents=10000 from public.payments where provider_payment_id='test-pay-5'),'full refund amount and status never regress to partial');
select public.reorder_course_content('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','modules',array['30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001']::uuid[]);
select pg_temp.assert((select position from public.modules where id='30000000-0000-0000-0000-000000000003')=0,'reorder swaps unique positions atomically');
select pg_temp.assert_error($q$select public.reorder_course_content('10000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','modules',array['30000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001']::uuid[])$q$,'23514','reorder rejects duplicate and missing IDs');
reset role;
rollback;
\echo 'Security integration assertions completed successfully; all fixtures rolled back.'

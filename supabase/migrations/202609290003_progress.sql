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

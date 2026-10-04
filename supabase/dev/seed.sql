-- Opt-in fixture for a DEVELOPMENT database only. Not part of migrations.
-- Example courses stay in draft and never enter the public catalog automatically.
-- psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SET app.allow_development_seed='true'" -f supabase/dev/seed.sql
begin;
do $$ begin
  if current_setting('app.allow_development_seed',true) is distinct from 'true' then
    raise exception 'Development seed disabled. Use a dedicated dev database and explicitly set app.allow_development_seed=true.';
  end if;
end $$;

insert into public.courses(id,slug,title,subtitle,description,category,level,price_cents,instructor,learning_outcomes,requirements,status,featured) values
 ('d0000000-0000-4000-8000-000000000001','demo-desarrollo-web','[DEMO] Desarrollo web de cero a producción','Convertí tus ideas en experiencias que funcionan.','Curso ficticio para explorar la academia en desarrollo. No contiene videos ni se vende en producción.','Desarrollo','Inicial',5490000,'Lucía Méndez (personaje ficticio)',array['Crear interfaces adaptables','Programar interacciones con JavaScript','Publicar tu primer proyecto'],array['Computadora con acceso a internet'],'draft',true),
 ('d0000000-0000-4000-8000-000000000002','demo-diseno-producto','[DEMO] Diseño UX/UI: de la idea al producto','Diseñá con intención, creá para las personas.','Curso ficticio para probar el catálogo y la edición. Agregá material propio para verificar el aula.','Diseño','Inicial',4290000,'Tomás Ríos (personaje ficticio)',array['Investigar necesidades reales','Diseñar componentes','Crear un prototipo interactivo'],array['No requiere experiencia previa'],'draft',true),
 ('d0000000-0000-4000-8000-000000000003','demo-datos-python','[DEMO] Análisis de datos con Python','Encontrá las historias que se esconden en los datos.','Curso de ejemplo sin contenido audiovisual. Esta ficha sólo debe existir en la base de desarrollo.','Datos','Intermedio',5990000,'Valentina Paz (personaje ficticio)',array['Limpiar datasets','Analizar datos','Comunicar hallazgos'],array['Conocimientos básicos de programación'],'draft',true)
on conflict(id) do nothing;

insert into public.modules(id,course_id,title,position) values
 ('d1000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','Primeros pasos',0),
 ('d1000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','Construí tu proyecto',1),
 ('d1000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000002','Diseño centrado en personas',0),
 ('d1000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000003','Exploración de datos',0)
on conflict(id) do nothing;

insert into public.lessons(id,course_id,module_id,title,description,duration_seconds,position,is_preview) values
 ('d2000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Bienvenida y hoja de ruta','Temario público de ejemplo.',720,0,true),
 ('d2000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Tu entorno de trabajo','Preparación de herramientas.',1080,1,false),
 ('d2000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','Interfaces adaptables','Estructura de una página.',1440,0,false),
 ('d2000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000002','Primer despliegue','Llevá tu proyecto a la web.',900,1,false),
 ('d2000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000003','Entender el problema','Introducción al proceso de diseño.',780,0,true),
 ('d2000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000003','Del boceto al prototipo','Iterar y validar una idea.',1260,1,false),
 ('d2000000-0000-4000-8000-000000000007','d0000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000004','Preguntas para tus datos','Introducción a la exploración.',840,0,true),
 ('d2000000-0000-4000-8000-000000000008','d0000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000004','Limpiar antes de analizar','Preparación de un dataset.',1500,1,false)
on conflict(id) do nothing;
commit;

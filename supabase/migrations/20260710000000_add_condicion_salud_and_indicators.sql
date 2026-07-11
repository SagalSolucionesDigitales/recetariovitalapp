-- Broaden profiles beyond prediabetes-only: one primary condition + per-condition indicators
alter table public.profiles
  add column condicion_salud text not null default 'prediabetes',
  add column colesterol_nivel text,
  add column circunferencia_cintura text,
  add column peso_kg numeric,
  add column estatura_cm numeric;

alter table public.profiles
  add constraint profiles_condicion_salud_check
    check (condicion_salud in ('prediabetes','cardiovascular','sindrome_metabolico','control_peso'));

alter table public.profiles
  add constraint profiles_colesterol_nivel_check
    check (colesterol_nivel is null or colesterol_nivel in ('menos200','200-239','mas240','no-se'));

alter table public.profiles
  add constraint profiles_circunferencia_cintura_check
    check (circunferencia_cintura is null or circunferencia_cintura in ('menos80','80-99','mas100','no-se'));

alter table public.profiles
  add constraint profiles_peso_kg_check
    check (peso_kg is null or (peso_kg > 0 and peso_kg < 400));

alter table public.profiles
  add constraint profiles_estatura_cm_check
    check (estatura_cm is null or (estatura_cm > 0 and estatura_cm < 260));

comment on column public.profiles.condicion_salud is
  'Primary health condition for the Mediterranean-Mexican nutrition plan: prediabetes | cardiovascular | sindrome_metabolico | control_peso';

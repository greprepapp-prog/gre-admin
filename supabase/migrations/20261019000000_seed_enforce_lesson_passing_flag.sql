-- Seed the "Enforce Lesson Passing (Sequential Progression)" feature flag.
-- The flag_key is what the mobile app reads; the description carries the
-- admin-facing label + bilingual subtext shown in the Feature Flags panel.
--
-- Default OFF so existing behaviour (all lessons/tests open) is preserved
-- until an admin explicitly turns sequential progression on. Safe to re-run.
insert into public.feature_flags (flag_key, description, is_enabled, variant_config)
values (
  'enforce_lesson_passing',
  'Enforce Lesson Passing (Sequential Progression). ON: тест/ШАЛГАЛТаа тэнцэж байж дараагийн хичээл дараалан нээгдэнэ. OFF: бүх хичээл, тест чөлөөтэй нээлттэй.',
  false,
  '{}'::jsonb
)
on conflict (flag_key) do nothing;

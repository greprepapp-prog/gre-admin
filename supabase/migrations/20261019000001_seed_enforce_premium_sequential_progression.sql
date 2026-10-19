-- Seed "Enforce Sequential Progression for Premium Users" feature flag.
-- Governs ONLY premium users; free users follow enforce_lesson_passing.
-- Default OFF: premium users get instant access to all lessons. Safe to re-run.
insert into public.feature_flags (flag_key, description, is_enabled, variant_config)
values (
  'enforce_premium_sequential_progression',
  'Enforce Sequential Progression for Premium Users. ON: Premium users must pass each lesson''s quiz to proceed to the next lesson. OFF: Premium users have instant access to all lessons without needing to pass quizzes sequentially.',
  false,
  '{}'::jsonb
)
on conflict (flag_key) do nothing;

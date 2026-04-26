-- Cleanup legacy Codex slugs that collide with LEVEL_1_SPEC
-- learn_modules holds all content inline (no learn_module_blocks table); also clean orphaned progress.

delete from public.learn_progress
where module_id in (
  select id from public.learn_modules
  where slug in ('chart-01-candles', 'craft-01-playbook', 'craft-01-playbook-intro', 'mind-01-loss-aversion')
);

delete from public.learn_recommendations
where module_id in (
  select id from public.learn_modules
  where slug in ('chart-01-candles', 'craft-01-playbook', 'craft-01-playbook-intro', 'mind-01-loss-aversion')
);

delete from public.learn_modules
where slug in ('chart-01-candles', 'craft-01-playbook', 'craft-01-playbook-intro', 'mind-01-loss-aversion');
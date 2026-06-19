-- ════════════════════════════════════════════════════════════════════════
-- Seed the prediction markets into Supabase so forecasts are REAL:
-- place_prediction() can record them, deduct FC, and move the odds.
-- Idempotent on slug; options start even (implied_pct 50, fc_allocated 0), so every
-- market shows 50/50 until people forecast. Re-runnable safely.
-- ════════════════════════════════════════════════════════════════════════

insert into public.markets (slug, kind, subject_type, category, type_label, title, pool_fc, closes_at, status) values
 ('fra_qf',      'yes_no',       'team',       'country',    'Knockout Stage',   'Will France pass the quarter-finals?',        1840000, '2026-07-11', 'open'),
 ('ball_mbappe', 'yes_no',       'player',     'player',     'Golden Ball',      'Will Mbappé win the Golden Ball?',            1240000, '2026-07-19', 'open'),
 ('boot_race',   'head_to_head', 'player',     'player',     'Golden Boot Race', 'Who will score more goals?',                   920000, '2026-07-19', 'open'),
 ('arg_win',     'yes_no',       'tournament', 'tournament', 'Tournament Winner','Will Argentina win the World Cup?',           1320000, '2026-07-19', 'open'),
 ('assist_king', 'head_to_head', 'player',     'player',     'Assist King',      'Who will register more assists?',              540000, '2026-07-19', 'open'),
 ('bra_final',   'yes_no',       'team',       'country',    'Reach The Final',  'Will Brazil reach the final?',                 760000, '2026-07-16', 'open'),
 ('glove_race',  'head_to_head', 'player',     'player',     'Golden Glove',     'Who will keep more clean sheets?',             280000, '2026-07-19', 'open'),
 ('mar_group',   'yes_no',       'team',       'country',    'Group Stage',      'Will Morocco escape the group stage?',         310000, '2026-06-27', 'open'),
 ('young_yamal', 'yes_no',       'player',     'player',     'Young Player',     'Will Yamal win the Young Player award?',       430000, '2026-07-19', 'open'),
 ('eng_group',   'yes_no',       'team',       'country',    'Group Stage',      'Will England win their group?',                520000, '2026-06-27', 'open')
on conflict (slug) do nothing;

-- Two options per market (side a / b). Even odds + zero allocation to start.
insert into public.market_options (market_id, label, side, implied_pct, fc_allocated, sort)
select m.id, o.label, o.side, 50, 0, o.sort
from public.markets m
join (values
  ('fra_qf','Yes','a',0),       ('fra_qf','No','b',1),
  ('ball_mbappe','Yes','a',0),  ('ball_mbappe','No','b',1),
  ('boot_race','Mbappé','a',0), ('boot_race','Haaland','b',1),
  ('arg_win','Yes','a',0),      ('arg_win','No','b',1),
  ('assist_king','Bellingham','a',0), ('assist_king','De Bruyne','b',1),
  ('bra_final','Yes','a',0),    ('bra_final','No','b',1),
  ('glove_race','E. Martínez','a',0), ('glove_race','Courtois','b',1),
  ('mar_group','Yes','a',0),    ('mar_group','No','b',1),
  ('young_yamal','Yes','a',0),  ('young_yamal','No','b',1),
  ('eng_group','Yes','a',0),    ('eng_group','No','b',1)
) as o(slug,label,side,sort) on o.slug = m.slug
where not exists (select 1 from public.market_options mo where mo.market_id = m.id);

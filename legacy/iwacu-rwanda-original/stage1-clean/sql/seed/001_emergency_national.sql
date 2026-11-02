-- Seed: NATIONAL emergency numbers (scope_code IS NULL). Run once after migration 003.
-- Source: Rwanda National Police official site, retrieved 2026-10-26.
INSERT INTO public.emergency_contacts
  (scope_code, category, label_kiny, label_eng, number, sort_order, status, source_url, source_note, verified_at)
VALUES
  (NULL, 'general', 'Ubutabazi bwihuse (Polisi)', 'General emergency (Police)', '112', 10, 'verified', 'https://police.gov.rw/home/', 'Listed under Emergency toll free numbers on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz),
  (NULL, 'ambulance', 'Ambulance (ubutabazi bw''ubuvuzi)', 'Ambulance (medical emergency)', '114', 20, 'pending', 'https://police.gov.rw/media/news-detail/news/rnp-joins-drive-to-end-abuse-of-emergency-help-lines/', 'Only found in a 2016 RNP news article. Owner must confirm before shown.', NULL),
  (NULL, 'fire', 'Inkongi y''umuriro n''ubutabazi', 'Fire and rescue', '111', 30, 'verified', 'https://police.gov.rw/home/', 'Listed on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz),
  (NULL, 'traffic', 'Impanuka zo mu muhanda', 'Traffic accidents', '113', 40, 'verified', 'https://police.gov.rw/home/', 'Listed on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz),
  (NULL, 'child', 'Umurongo w''abana (gutabaza)', 'Child help-line', '116', 50, 'pending', 'https://police.gov.rw/media/news-detail/news/rnp-joins-drive-to-end-abuse-of-emergency-help-lines/', 'Only found in a 2016 RNP news article. Owner must confirm before shown.', NULL),
  (NULL, 'gbv', 'Ihohoterwa rishingiye ku gitsina', 'Gender-based violence', '3512', 60, 'pending', 'https://police.gov.rw/media/news-detail/news/rnp-joins-drive-to-end-abuse-of-emergency-help-lines/', 'Only found in a 2016 RNP news article. Owner must confirm before shown.', NULL),
  (NULL, 'police_abuse', 'Gutotezwa n''umupolisi', 'Abuse by a police officer', '3511', 70, 'verified', 'https://police.gov.rw/home/', 'Listed on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz),
  (NULL, 'maritime', 'Ibibazo byo mu mazi', 'Maritime problems', '110', 80, 'verified', 'https://police.gov.rw/home/', 'Listed on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz),
  (NULL, 'anti_corruption', 'Kurwanya ruswa', 'Anti-corruption', '997', 90, 'verified', 'https://police.gov.rw/home/', 'Listed on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz),
  (NULL, 'driving_licence', 'Ibibazo bijyanye n''impushya zo gutwara', 'Driving licence queries', '118', 100, 'verified', 'https://police.gov.rw/home/', 'Listed on the Rwanda National Police home page, retrieved 2026-10-26.', '2026-10-26'::timestamptz)
ON CONFLICT DO NOTHING;

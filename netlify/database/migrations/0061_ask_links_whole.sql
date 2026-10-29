-- An ask's link is a whole one, starting https://, as staff now give it.
-- The two seeded as paths of this site get its address in front.
UPDATE asks SET url = 'https://pauseai.uk' || url WHERE url LIKE '/%';

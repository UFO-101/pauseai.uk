-- Where the letter of one of pauseai.info's old campaigns can be read. A
-- campaign in code has its own page, /campaigns/<slug>, and no URL here.
-- The Liability letter's PDF is no longer on the site, so its link is to
-- the copy in the site's repository, as it was the day before it became
-- the Frontier AI letter.
ALTER TABLE campaigns ADD COLUMN url text CHECK (url ~ '^https://');
UPDATE campaigns SET url = 'https://pauseai.uk/pdfs/Frontier-AI-Open-Letter.pdf' WHERE slug = 'pauseai-info-frontier-ai';
UPDATE campaigns SET url = 'https://github.com/UFO-101/pauseai.uk/blob/24775a7e0b48155a58ae9c39f45249778d67d843/public/pdfs/AI-Liability-Open-Letter.pdf'
  WHERE slug = 'pauseai-info-liability';
UPDATE campaigns SET url = 'https://pauseai.uk/campaigns/dear-sir-demis-2025' WHERE slug = 'pauseai-info-deepmind';

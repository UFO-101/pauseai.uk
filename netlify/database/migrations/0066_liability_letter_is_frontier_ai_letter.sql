-- pauseai.info's Liability letter asked MPs to sign the same open letter as
-- its Frontier AI letter (/pdfs/Frontier-AI-Open-Letter.pdf), so its letters
-- are to the same ask.
UPDATE campaigns SET ask = 'frontier-ai-letter' WHERE slug = 'pauseai-info-liability';

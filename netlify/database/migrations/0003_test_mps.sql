-- More than one test MP, each found by its own postcode (lib/test-mps.ts):
-- a second one has already signed the letter to the Prime Minister.

ALTER TABLE politicians ADD COLUMN test_postcode text UNIQUE;
UPDATE politicians SET test_postcode = 'ZZ99ZZ' WHERE is_test;
ALTER TABLE politicians ADD CONSTRAINT politicians_test_postcode CHECK (is_test = (test_postcode IS NOT NULL));
DROP INDEX politicians_one_test_mp;

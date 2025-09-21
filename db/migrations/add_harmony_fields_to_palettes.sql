ALTER TABLE palettes
ADD COLUMN harmony VARCHAR(255),
ADD COLUMN harmony_justification TEXT;

COMMENT ON COLUMN palettes.harmony IS 'The color harmony rule used to generate the palette (e.g., Analogous, Complementary).';
COMMENT ON COLUMN palettes.harmony_justification IS 'A detailed explanation of why the harmony was chosen and how it fits the user''s briefing.';

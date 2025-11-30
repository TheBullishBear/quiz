-- Drop the existing view
DROP VIEW IF EXISTS questions_without_answers;

-- Recreate the view with image_url included
CREATE VIEW questions_without_answers AS
SELECT 
  id,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  round_number,
  question_order,
  created_at,
  created_by,
  image_url
FROM questions;
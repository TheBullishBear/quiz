-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS questions_without_answers;

CREATE VIEW questions_without_answers 
WITH (security_invoker = true)
AS
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
-- Add time_limit_seconds to quiz_sessions for configurable timer
ALTER TABLE quiz_sessions ADD COLUMN time_limit_seconds INTEGER DEFAULT 60;

-- Create a view for questions without correct answers (for participants)
CREATE OR REPLACE VIEW questions_without_answers AS
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
  created_by
FROM questions;

-- Grant access to the view
GRANT SELECT ON questions_without_answers TO authenticated;

-- Enable RLS on the view
ALTER VIEW questions_without_answers SET (security_invoker = true);

-- Update participant_answers to calculate points based on correctness and speed
-- Points calculation: 100 for correct answer, bonus points for speed (up to 50 extra)
CREATE OR REPLACE FUNCTION calculate_answer_points()
RETURNS TRIGGER AS $$
DECLARE
  correct_ans TEXT;
  max_time_ms INTEGER;
  speed_bonus INTEGER;
BEGIN
  -- Get the correct answer for this question
  SELECT correct_answer INTO correct_ans
  FROM questions
  WHERE id = NEW.question_id;
  
  -- Check if answer is correct
  NEW.is_correct := (NEW.answer = correct_ans);
  
  IF NEW.is_correct THEN
    -- Base points for correct answer
    NEW.points_earned := 100;
    
    -- Get time limit from session (convert seconds to ms)
    SELECT time_limit_seconds * 1000 INTO max_time_ms
    FROM quiz_sessions
    WHERE id = NEW.session_id;
    
    -- Calculate speed bonus (0-50 points based on how fast they answered)
    -- Faster answers get more bonus points
    IF NEW.time_taken_ms < max_time_ms THEN
      speed_bonus := ROUND(50 * (1 - (NEW.time_taken_ms::FLOAT / max_time_ms::FLOAT)));
      NEW.points_earned := NEW.points_earned + speed_bonus;
    END IF;
  ELSE
    NEW.points_earned := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-calculate points on insert
DROP TRIGGER IF EXISTS calculate_points_trigger ON participant_answers;
CREATE TRIGGER calculate_points_trigger
  BEFORE INSERT ON participant_answers
  FOR EACH ROW
  EXECUTE FUNCTION calculate_answer_points();

-- Update total_points in profiles after answer is submitted
CREATE OR REPLACE FUNCTION update_profile_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET total_points = total_points + NEW.points_earned
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update profile points
DROP TRIGGER IF EXISTS update_points_trigger ON participant_answers;
CREATE TRIGGER update_points_trigger
  AFTER INSERT ON participant_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_points();

-- Update the questions RLS policy to only allow admins to see correct answers
DROP POLICY IF EXISTS "Approved participants can view questions" ON questions;

CREATE POLICY "Admins can view all question details"
ON questions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants can view questions without answers"
ON questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND status = 'approved'
  )
);
-- Add option columns to questions table
ALTER TABLE public.questions
ADD COLUMN option_a TEXT NOT NULL DEFAULT '',
ADD COLUMN option_b TEXT NOT NULL DEFAULT '',
ADD COLUMN option_c TEXT NOT NULL DEFAULT '',
ADD COLUMN option_d TEXT NOT NULL DEFAULT '';

-- Update correct_answer column to accept only A, B, C, or D
-- First, we need to handle existing data (if any) by setting a default
UPDATE public.questions
SET correct_answer = 'A'
WHERE correct_answer IS NOT NULL;

-- Add CHECK constraint to ensure correct_answer is only A, B, C, or D
ALTER TABLE public.questions
ADD CONSTRAINT questions_correct_answer_check 
CHECK (correct_answer IN ('A', 'B', 'C', 'D'));
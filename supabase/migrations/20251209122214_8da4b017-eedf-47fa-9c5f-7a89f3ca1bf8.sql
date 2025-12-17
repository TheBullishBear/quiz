-- Add missing columns and tables that the code expects

-- Add name column to quiz_sessions if it doesn't exist
ALTER TABLE public.quiz_sessions 
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS group_name text;

-- Create session_users table for assigning users to sessions
CREATE TABLE IF NOT EXISTS public.session_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create session_questions table for assigning questions to sessions
CREATE TABLE IF NOT EXISTS public.session_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

-- Enable RLS on new tables
ALTER TABLE public.session_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for session_users
CREATE POLICY "Admins can manage session users"
ON public.session_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own session assignments"
ON public.session_users
FOR SELECT
USING (user_id = auth.uid());

-- RLS policies for session_questions
CREATE POLICY "Admins can manage session questions"
ON public.session_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view session questions for their sessions"
ON public.session_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.session_users su
    WHERE su.session_id = session_questions.session_id
    AND su.user_id = auth.uid()
  )
);
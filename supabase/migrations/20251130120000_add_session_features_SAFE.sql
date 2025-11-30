-- Safe migration script that checks before applying
-- This version can be run multiple times safely

-- Add name field to quiz_sessions (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quiz_sessions' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.quiz_sessions ADD COLUMN name TEXT;
  END IF;
END $$;

-- Create session_users junction table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.session_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, user_id)
);

-- Create session_questions junction table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  question_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

-- Enable RLS on new tables (idempotent)
ALTER TABLE public.session_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_questions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can manage session users" ON public.session_users;
DROP POLICY IF EXISTS "Users can view their own session assignments" ON public.session_users;
DROP POLICY IF EXISTS "Admins can manage session questions" ON public.session_questions;
DROP POLICY IF EXISTS "Approved participants can view session questions" ON public.session_questions;

-- RLS Policies for session_users
CREATE POLICY "Admins can manage session users"
  ON public.session_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own session assignments"
  ON public.session_users FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for session_questions
CREATE POLICY "Admins can manage session questions"
  ON public.session_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved participants can view session questions"
  ON public.session_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND status = 'approved'
    )
  );

-- Create indexes for better performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_session_users_session_id ON public.session_users(session_id);
CREATE INDEX IF NOT EXISTS idx_session_users_user_id ON public.session_users(user_id);
CREATE INDEX IF NOT EXISTS idx_session_questions_session_id ON public.session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_questions_question_id ON public.session_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_session_questions_order ON public.session_questions(session_id, question_order);


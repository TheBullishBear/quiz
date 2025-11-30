-- Add DELETE policy for admins on participant_answers table
-- This allows admins to delete participant answers when resetting quiz sessions

CREATE POLICY "Admins can delete all answers"
  ON public.participant_answers
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));


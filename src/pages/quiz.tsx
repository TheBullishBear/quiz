import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Trophy, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Quiz = () => {
  const { user, loading, isAdmin, isApproved } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [sessionQuestions, setSessionQuestions] = useState<any[]>([]); // Store all questions for current round
  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  const [previousSessionStatus, setPreviousSessionStatus] = useState<string | null>(null);
  const [previousQuestionId, setPreviousQuestionId] = useState<string | null>(null);
  const [sessionVersion, setSessionVersion] = useState<number>(0); // Track session version to detect resets
  const isResettingRef = useRef(false);
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastSessionUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchActiveSession();
      
      // Set up smart polling:
      // - If no question: poll every 3 seconds (waiting for question)
      // - If has question: poll every 10 seconds (much less frequent to reduce reload feeling)
      //   Only need to check for new questions or round completion
      const pollInterval = currentQuestion ? 10000 : 3000;
      
      const interval = setInterval(() => {
        // Only poll if not in the middle of a reset
        if (!isResettingRef.current) {
          fetchActiveSession();
        }
      }, pollInterval);

      return () => clearInterval(interval);
    }
  }, [user, currentQuestion]); // Adjust polling frequency based on whether we have a question

  // Watch for session version changes - when version changes, clear everything
  useEffect(() => {
    if (sessionVersion > 0) {
      console.log('Session version changed - forcing complete state clear:', sessionVersion);
      setCurrentQuestion(null);
      setHasAnsweredCurrent(false);
      setAnswer('');
      setTimeRemaining(null);
      setStartTime(Date.now());
      setAnsweredQuestions(new Set());
      setSessionQuestions([]); // Clear session questions
      lastQuestionIdRef.current = null;
    }
  }, [sessionVersion]);

  // Watch for question ID changes and force state reset if needed
  useEffect(() => {
    if (session?.current_question_id) {
      // If we have a current question in state but it doesn't match the session's question ID, clear it
      if (currentQuestion && currentQuestion.id !== session.current_question_id) {
        console.log('Question ID mismatch detected - clearing state:', {
          stateQuestionId: currentQuestion.id,
          sessionQuestionId: session.current_question_id
        });
        setCurrentQuestion(null);
        setHasAnsweredCurrent(false);
        setAnswer('');
        setTimeRemaining(null);
        setStartTime(Date.now());
        setAnsweredQuestions(new Set()); // Clear answered questions
        setSessionQuestions([]); // Clear session questions
        lastQuestionIdRef.current = null;
      }
    } else if (currentQuestion) {
      // If session has no question ID but we have a question in state, clear it
      console.log('Session has no question but state does - clearing ALL state');
      setCurrentQuestion(null);
      setHasAnsweredCurrent(false);
      setAnswer('');
      setTimeRemaining(null);
      setStartTime(Date.now());
      setAnsweredQuestions(new Set()); // Clear answered questions
      setSessionQuestions([]); // Clear session questions
      lastQuestionIdRef.current = null;
    }
  }, [session?.current_question_id, currentQuestion]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && currentQuestion) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, currentQuestion]);

  const fetchActiveSession = async () => {
    if (!user) return;
    
    // Skip if we're in the middle of a reset to prevent flickering
    if (isResettingRef.current) {
      return;
    }

    try {
      // First, check if user is assigned to a session
      const { data: userSession, error: userSessionError } = await supabase
        .from('session_users')
        .select('session_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (userSessionError) {
        console.error('Error fetching user session:', userSessionError);
        toast({
          title: "Error",
          description: "Failed to fetch session assignment.",
          variant: "destructive",
        });
        return;
      }

      if (!userSession) {
        // Don't show toast on every poll if user is not assigned
        // Only navigate if we're not already on dashboard
        if (window.location.pathname !== '/dashboard') {
          toast({
            title: "No Session Assignment",
            description: "You are not assigned to any quiz session.",
            variant: "destructive",
          });
          navigate('/dashboard');
        }
        return;
      }

      // Get the session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', userSession.session_id)
        .maybeSingle();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        toast({
          title: "Error",
          description: "Failed to fetch session details.",
          variant: "destructive",
        });
        return;
      }

      if (!sessionData) {
        if (window.location.pathname !== '/dashboard') {
          toast({
            title: "No Active Quiz",
            description: "Your assigned session was not found.",
            variant: "destructive",
          });
          navigate('/dashboard');
        }
        return;
      }

      // Fetch all session questions for the current round to calculate sequential numbers
      if (sessionData.status && (sessionData.status === 'round_1' || sessionData.status === 'round_2' || sessionData.status === 'round_3' || sessionData.status === 'finals')) {
        const roundNumberMap: Record<string, number> = {
          'round_1': 1,
          'round_2': 2,
          'round_3': 3,
          'finals': 4
        };
        const roundNumber = roundNumberMap[sessionData.status];
        
        // Fetch session questions
        const { data: sessionQsData } = await supabase
          .from('session_questions')
          .select('question_id')
          .eq('session_id', sessionData.id);

        if (sessionQsData && sessionQsData.length > 0) {
          const questionIds = sessionQsData.map(sq => sq.question_id);
          const { data: roundQuestions } = await supabase
            .from('questions')
            .select('id, round_number, question_order')
            .in('id', questionIds)
            .eq('round_number', roundNumber)
            .order('question_order', { ascending: true });

          if (roundQuestions) {
            setSessionQuestions(roundQuestions);
          }
        }
      } else {
        setSessionQuestions([]);
      }

      // If session is completed, redirect
      if (sessionData.status === 'completed') {
        toast({
          title: "Quiz Completed",
          description: "This quiz session has been completed.",
        });
        navigate('/dashboard');
        return;
      }

      // Check if any round is complete (status is a round but no current question)
      // This means all questions in that round have been answered
      const isRoundComplete = (
        sessionData.status === 'round_1' || 
        sessionData.status === 'round_2' || 
        sessionData.status === 'round_3' || 
        sessionData.status === 'finals'
      ) && !sessionData.current_question_id;

      if (isRoundComplete) {
        const roundName = sessionData.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        console.log(`${roundName} complete - redirecting to dashboard`);
        
        // Clear any question state
        setCurrentQuestion(null);
        setHasAnsweredCurrent(false);
        setAnswer('');
        setTimeRemaining(null);
        
        toast({
          title: `${roundName} Complete!`,
          description: `You have completed ${roundName}. Redirecting to dashboard...`,
        });
        
        // Redirect after a short delay to show the toast
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
        return;
      }

      // Detect if session was reset using updated_at timestamp
      // When session is reset, updated_at changes, so we can detect it
      const sessionWasUpdated = lastSessionUpdatedAtRef.current && 
          lastSessionUpdatedAtRef.current !== sessionData.updated_at;
      
      // Detect if session was reset (status changed from active to not_started)
      const statusChangedToNotStarted = previousSessionStatus && 
          previousSessionStatus !== 'not_started' && 
          sessionData.status === 'not_started';
      
      // Detect if question ID was cleared (reset) - question went from non-null to null
      const questionIdCleared = previousQuestionId !== null && 
          previousQuestionId !== undefined &&
          sessionData.current_question_id === null;

      // Detect if question ID changed to a different question (not just cleared)
      const questionIdChanged = previousQuestionId !== null && 
          previousQuestionId !== undefined &&
          sessionData.current_question_id !== null &&
          previousQuestionId !== sessionData.current_question_id;
      
      // If session was updated and question ID changed or cleared, it's likely a reset
      const isLikelyReset = sessionWasUpdated && (questionIdCleared || questionIdChanged);

      if (statusChangedToNotStarted || questionIdCleared || isLikelyReset) {
        console.log('Session reset detected:', {
          statusChanged: statusChangedToNotStarted,
          questionIdCleared,
          isLikelyReset,
          sessionWasUpdated,
          previousStatus: previousSessionStatus,
          currentStatus: sessionData.status,
          previousQuestionId,
          currentQuestionId: sessionData.current_question_id,
          currentQuestionInState: currentQuestion?.id,
          lastQuestionIdRef: lastQuestionIdRef.current,
          lastUpdatedAt: lastSessionUpdatedAtRef.current,
          newUpdatedAt: sessionData.updated_at
        });
        // Increment session version to force complete remount
        setSessionVersion(prev => prev + 1);
        // Mark that we're resetting to prevent flickering
        isResettingRef.current = true;
        // IMMEDIATELY clear the ref first (synchronous)
        lastQuestionIdRef.current = null;
        // Force clear ALL question state including answered questions
        setCurrentQuestion(null);
        setHasAnsweredCurrent(false);
        setAnswer('');
        setTimeRemaining(null);
        setStartTime(Date.now());
        setAnsweredQuestions(new Set()); // Clear answered questions set
        setSessionQuestions([]); // Clear session questions
        console.log('All state cleared due to reset - refs and state cleared, session version incremented');
        // Reset the flag after a longer delay to ensure database answers are cleared
        // and the student's state is fully reset before checking for answers again
        setTimeout(() => {
          console.log('Clearing reset flag - answers should be cleared from database now');
          isResettingRef.current = false;
        }, 3000); // Increased delay to ensure database deletion completes
      } else if (questionIdChanged) {
        // Question ID changed to a different question - clear state to force reload
        console.log('Question ID changed - clearing state to reload:', {
          previousQuestionId,
          newQuestionId: sessionData.current_question_id,
          currentQuestionInState: currentQuestion?.id,
          lastQuestionIdRef: lastQuestionIdRef.current
        });
        // IMMEDIATELY clear the ref first (synchronous)
        lastQuestionIdRef.current = null;
        setCurrentQuestion(null);
        setHasAnsweredCurrent(false);
        setAnswer('');
        setTimeRemaining(null);
        setStartTime(Date.now());
        setSessionQuestions([]); // Clear session questions
      }

      // Update previous values AFTER processing
      // This ensures we can detect changes on the next poll
      setPreviousSessionStatus(sessionData.status);
      setPreviousQuestionId(sessionData.current_question_id);
      lastSessionUpdatedAtRef.current = sessionData.updated_at; // Track session update timestamp
      setSession(sessionData);
      
      // If we just reset and now have a new question, make sure we clear any stale refs
      if (isResettingRef.current && sessionData.current_question_id) {
        console.log('Reset detected but new question exists - ensuring clean state');
        lastQuestionIdRef.current = null; // Force clear to ensure we load the new question
      }

      // If session is reset (not_started) or no current question, clear state and return
      if (sessionData.status === 'not_started' || !sessionData.current_question_id) {
        // Always clear question state when there's no current question
        if (currentQuestion || hasAnsweredCurrent || answer || lastQuestionIdRef.current !== null) {
          console.log('Clearing question state - session not started or no current question', {
            hasCurrentQuestion: !!currentQuestion,
            hasAnsweredCurrent,
            hasAnswer: !!answer,
            lastQuestionIdRef: lastQuestionIdRef.current
          });
          // Clear ref immediately
          lastQuestionIdRef.current = null;
          setCurrentQuestion(null);
          setHasAnsweredCurrent(false);
          setAnswer('');
          setTimeRemaining(null);
          setStartTime(Date.now());
        }
        return; // Don't proceed to fetch question if session is not started
      }

      // Check if there's a current question
      if (sessionData.current_question_id) {
        // Check if this is a different question than what we have loaded
        // This is critical for detecting resets and question changes
        // Also check if we're in a reset state - if so, always treat as different
        const isDifferentQuestion = isResettingRef.current ||
                                     !currentQuestion || 
                                     currentQuestion.id !== sessionData.current_question_id ||
                                     lastQuestionIdRef.current !== sessionData.current_question_id;

        // If it's the same question and we're not resetting, skip to prevent unnecessary work
        if (!isDifferentQuestion && !isResettingRef.current) {
          // Same question already loaded - skip fetch to prevent reloading feeling
          return;
        }
        
        // If we're resetting, clear the reset flag after we start loading
        if (isResettingRef.current) {
          console.log('Processing question after reset - will clear reset flag after load');
        }

        // If it's a different question, clear state first
        if (isDifferentQuestion) {
          console.log('Different question detected - clearing state first:', {
            currentQuestionId: currentQuestion?.id,
            lastQuestionIdRef: lastQuestionIdRef.current,
            newQuestionId: sessionData.current_question_id
          });
          setCurrentQuestion(null);
          setAnswer('');
          setHasAnsweredCurrent(false);
          setTimeRemaining(null);
          setStartTime(Date.now());
        }

        console.log('Session has current question:', {
          questionId: sessionData.current_question_id,
          sessionStatus: sessionData.status,
          currentQuestionInState: currentQuestion?.id,
          lastQuestionIdRef: lastQuestionIdRef.current,
          hasAnsweredCurrentInState: hasAnsweredCurrent,
          isDifferentQuestion,
          isResetting: isResettingRef.current
        });

        // If we're resetting, always clear hasAnsweredCurrent first
        // This ensures that even if the database check finds an old answer (due to timing),
        // we'll treat it as unanswered
        if (isResettingRef.current) {
          console.log('Reset in progress - forcing hasAnsweredCurrent to false');
          setHasAnsweredCurrent(false);
        }

        // Check if user has already answered this question
        // But only if we're not in a reset state
        let hasAnswered = false;
        if (!isResettingRef.current) {
          const { data: existingAnswer } = await supabase
            .from('participant_answers')
            .select('id')
            .eq('user_id', user.id)
            .eq('session_id', sessionData.id)
            .eq('question_id', sessionData.current_question_id)
            .maybeSingle();

          hasAnswered = !!existingAnswer;
        } else {
          console.log('Skipping answer check - reset in progress');
        }

        console.log('Answer check result:', {
          questionId: sessionData.current_question_id,
          hasAnswered,
          isResetting: isResettingRef.current,
          existingAnswerId: hasAnswered ? 'found' : 'none'
        });

        // Since we already checked and cleared state above if it's a different question,
        // we can proceed to fetch the question
        // The state should already be cleared if isDifferentQuestion was true
        if (isDifferentQuestion) {
          console.log('Fetching new question:', {
            questionId: sessionData.current_question_id,
            previousQuestionId: currentQuestion?.id,
            lastQuestionIdRef: lastQuestionIdRef.current,
            isAdmin,
            isApproved,
            userId: user?.id
          });

          // Use questions table directly - RLS policy allows approved users
          // The policy "Participants can view questions without answers" should work
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .select('id, question_text, option_a, option_b, option_c, option_d, round_number, question_order, image_url, created_at')
            .eq('id', sessionData.current_question_id)
            .maybeSingle();

          if (questionError) {
            console.error('Error fetching question:', questionError);
            console.log('Error details:', {
              code: questionError.code,
              message: questionError.message,
              details: questionError.details,
              hint: questionError.hint
            });
            console.log('Current question ID:', sessionData.current_question_id);
            console.log('Is Admin:', isAdmin);
            
            // Check if it's a permission error (RLS issue)
            if (questionError.code === 'PGRST116' || questionError.message?.includes('permission') || questionError.message?.includes('row-level security')) {
              toast({
                title: "Permission Error",
                description: "You don't have permission to view this question. Please ensure your account is approved.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Error",
                description: `Failed to fetch question: ${questionError.message}`,
                variant: "destructive",
              });
            }
            setCurrentQuestion(null);
            setHasAnsweredCurrent(false);
            return;
          }

          if (questionData) {
            // Double-check the question ID matches what we requested
            if (questionData.id !== sessionData.current_question_id) {
              console.error('Question ID mismatch!', {
                requested: sessionData.current_question_id,
                received: questionData.id
              });
              setCurrentQuestion(null);
              setHasAnsweredCurrent(false);
              return;
            }

            console.log('Question loaded successfully:', {
              questionId: questionData.id,
              questionOrder: questionData.question_order,
              roundNumber: questionData.round_number,
              hasAnswered
            });
            
            // Set the question and state
            setCurrentQuestion(questionData);
            setStartTime(Date.now());
            setAnswer(''); // Reset answer for new question
            
            // If we're resetting, always set hasAnsweredCurrent to false
            // This ensures that even if the database still has the answer (timing issue),
            // we treat it as unanswered after a reset
            if (isResettingRef.current) {
              console.log('Question loaded after reset - forcing hasAnsweredCurrent to false');
              setHasAnsweredCurrent(false);
              // Don't clear reset flag yet - let the timeout handle it
              // This ensures we don't check for old answers
            } else {
              setHasAnsweredCurrent(hasAnswered); // Set based on whether user answered THIS question
            }
            
            lastQuestionIdRef.current = questionData.id; // Update ref to track current question
            
            // Set time remaining from session
            if (sessionData.time_limit_seconds) {
              setTimeRemaining(sessionData.time_limit_seconds);
            }
          } else {
            console.warn('Question not found:', sessionData.current_question_id);
            console.log('Query returned no data and no error - likely RLS blocking access');
            // Question ID exists but question not found - might be deleted or RLS blocking
            toast({
              title: "Question Not Found",
              description: "Unable to access the question. Please ensure your account is approved and try again.",
              variant: "destructive",
            });
            setCurrentQuestion(null);
            setHasAnsweredCurrent(false);
          }
        } else {
          // Same question - just update the answered status if it changed
          // Re-check if user has answered (in case they just submitted)
          // But don't update if nothing changed to prevent unnecessary re-renders
          if (hasAnsweredCurrent !== hasAnswered) {
            console.log('Answer status changed:', { hasAnsweredCurrent, hasAnswered });
            setHasAnsweredCurrent(hasAnswered);
          }
          // If everything matches, don't do anything to prevent re-renders
          return;
        }
      } else {
        // No current question - show waiting screen
        console.log('No current question ID. Session status:', sessionData.status);
        // Always clear question state when there's no current question
        // This ensures reset works properly
        if (currentQuestion) {
          console.log('Clearing question state - no current question in session');
          setCurrentQuestion(null);
          setHasAnsweredCurrent(false);
          setAnswer('');
          setTimeRemaining(null);
        }
      }
    } catch (error: any) {
      console.error('Unexpected error in fetchActiveSession:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please select an answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (hasAnsweredCurrent) {
      toast({
        title: "Already Answered",
        description: "You have already submitted an answer for this question.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const timeTaken = Date.now() - startTime;

    try {
      const { error } = await supabase
        .from('participant_answers')
        .insert({
          user_id: user!.id,
          session_id: session.id,
          question_id: currentQuestion.id,
          answer: answer.trim(),
          time_taken_ms: timeTaken,
        });

      if (error) {
        // Check if it's a duplicate answer error
        if (error.code === '23505') {
          toast({
            title: "Already Answered",
            description: "You have already submitted an answer for this question.",
            variant: "destructive",
          });
          setHasAnsweredCurrent(true);
          return;
        }
        throw error;
      }

      toast({
        title: "Answer Submitted!",
        description: "Your answer has been recorded. Waiting for the next question...",
      });

      setAnswer('');
      setHasAnsweredCurrent(true);
      // Keep the question visible but show it's been answered
      // The polling will automatically pick up the next question when admin sets it
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow">
          <Trophy className="h-16 w-16 text-primary" />
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <Clock className="h-16 w-16 text-accent mx-auto mb-4 animate-pulse" />
            <CardTitle className="text-2xl">Waiting for Question</CardTitle>
            <CardDescription>
              The quiz master will release the next question shortly. Stay ready!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Quiz Arena
          </h1>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <Card className="shadow-xl border-primary/30">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  Question {(() => {
                    // Calculate sequential question number based on position in session's round questions
                    if (sessionQuestions.length > 0 && currentQuestion) {
                      const questionIndex = sessionQuestions.findIndex(q => q.id === currentQuestion.id);
                      return questionIndex >= 0 ? questionIndex + 1 : currentQuestion.question_order;
                    }
                    return currentQuestion.question_order;
                  })()}
                </CardTitle>
                <CardDescription>
                  Round {currentQuestion.round_number}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-lg font-bold text-primary capitalize">
                  {session.status.replace('_', ' ')}
                </div>
                {timeRemaining !== null && timeRemaining > 0 && (
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground">Time Remaining</div>
                    <div className={`text-xl font-bold ${timeRemaining <= 10 ? 'text-red-500' : 'text-primary'}`}>
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              {currentQuestion.image_url ? (
                <div className="space-y-4">
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question" 
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                  {currentQuestion.question_text && (
                    <p className="text-lg font-medium leading-relaxed mt-4">
                      {currentQuestion.question_text}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-lg font-medium leading-relaxed">
                  {currentQuestion.question_text}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Select Your Answer</label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={answer === 'A' ? 'default' : 'outline'}
                  onClick={() => setAnswer('A')}
                  disabled={submitting}
                  className="h-auto py-4 px-6 text-left justify-start"
                >
                  <span className="font-bold mr-2">A:</span>
                  <span>{currentQuestion.option_a}</span>
                </Button>
                <Button
                  variant={answer === 'B' ? 'default' : 'outline'}
                  onClick={() => setAnswer('B')}
                  disabled={submitting}
                  className="h-auto py-4 px-6 text-left justify-start"
                >
                  <span className="font-bold mr-2">B:</span>
                  <span>{currentQuestion.option_b}</span>
                </Button>
                <Button
                  variant={answer === 'C' ? 'default' : 'outline'}
                  onClick={() => setAnswer('C')}
                  disabled={submitting}
                  className="h-auto py-4 px-6 text-left justify-start"
                >
                  <span className="font-bold mr-2">C:</span>
                  <span>{currentQuestion.option_c}</span>
                </Button>
                <Button
                  variant={answer === 'D' ? 'default' : 'outline'}
                  onClick={() => setAnswer('D')}
                  disabled={submitting}
                  className="h-auto py-4 px-6 text-left justify-start"
                >
                  <span className="font-bold mr-2">D:</span>
                  <span>{currentQuestion.option_d}</span>
                </Button>
              </div>
            </div>

            {hasAnsweredCurrent ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Answer Submitted Successfully!</p>
                  <p className="text-sm text-green-600 mt-1">Waiting for the next question...</p>
                </div>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleSubmitAnswer}
                disabled={submitting || !answer}
                size="lg"
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Answer'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;

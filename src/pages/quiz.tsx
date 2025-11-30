import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Trophy, Clock, ArrowLeft, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Quiz = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchActiveSession();
      
      // Set up polling to check for new questions every 2 seconds
      const interval = setInterval(() => {
        fetchActiveSession();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [user, currentQuestion?.id]); // Re-run when question changes to ensure polling continues

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

    // First, check if user is assigned to a session
    const { data: userSession } = await supabase
      .from('session_users')
      .select('session_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!userSession) {
      toast({
        title: "No Session Assignment",
        description: "You are not assigned to any quiz session.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    // Get the session details
    const { data: sessionData } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', userSession.session_id)
      .single();

    if (!sessionData) {
      toast({
        title: "No Active Quiz",
        description: "Your assigned session was not found.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
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

    setSession(sessionData);

    // Check if there's a current question
    if (sessionData.current_question_id) {
      // Check if user has already answered this question
      const { data: existingAnswer } = await supabase
        .from('participant_answers')
        .select('id')
        .eq('user_id', user.id)
        .eq('session_id', sessionData.id)
        .eq('question_id', sessionData.current_question_id)
        .maybeSingle();

      const hasAnswered = !!existingAnswer;

      // Always check if it's a different question (even if currentQuestion exists)
      const isNewQuestion = !currentQuestion || currentQuestion.id !== sessionData.current_question_id;
      
      if (isNewQuestion) {
        const { data: questionData } = await supabase
          .from('questions')
          .select('*')
          .eq('id', sessionData.current_question_id)
          .single();

        if (questionData) {
          setCurrentQuestion(questionData);
          setStartTime(Date.now());
          setAnswer(''); // Reset answer for new question
          setHasAnsweredCurrent(hasAnswered);
          // Set time remaining from session
          if (sessionData.time_limit_seconds) {
            setTimeRemaining(sessionData.time_limit_seconds);
          }
        }
      } else {
        // Same question - just update the answered status if it changed
        if (hasAnsweredCurrent !== hasAnswered) {
          setHasAnsweredCurrent(hasAnswered);
        }
      }
    } else {
      // No current question - show waiting screen
      // Only clear if we had a question before (to avoid flickering)
      if (currentQuestion) {
        setCurrentQuestion(null);
        setHasAnsweredCurrent(false);
      }
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
                  Question {currentQuestion.question_order}
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

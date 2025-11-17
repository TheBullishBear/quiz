import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Trophy, Clock, ArrowLeft } from 'lucide-react';
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchActiveSession();
    }
  }, [user]);

  const fetchActiveSession = async () => {
    const { data: sessionData } = await supabase
      .from('quiz_sessions')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sessionData) {
      toast({
        title: "No Active Quiz",
        description: "There is no active quiz session at the moment.",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    setSession(sessionData);

    // Determine the current round from status
    const statusToRound: { [key: string]: number } = {
      'round_1': 1,
      'round_2': 2,
      'round_3': 3,
      'finals': 4,
    };

    const currentRound = statusToRound[sessionData.status];
    
    if (!currentRound) {
      // Quiz hasn't started yet
      return;
    }

    // Fetch all questions for the current round
    const { data: roundQuestions } = await supabase
      .from('questions')
      .select('*')
      .eq('round_number', currentRound)
      .order('question_order', { ascending: true });

    if (!roundQuestions || roundQuestions.length === 0) {
      return;
    }

    // Fetch user's answers for this session
    const { data: userAnswers } = await supabase
      .from('participant_answers')
      .select('question_id')
      .eq('user_id', user!.id)
      .eq('session_id', sessionData.id);

    const answeredQuestionIds = new Set(userAnswers?.map(a => a.question_id) || []);

    // Find the first unanswered question
    const nextQuestion = roundQuestions.find(q => !answeredQuestionIds.has(q.id));

    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setStartTime(Date.now());
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please enter your answer before submitting.",
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

      if (error) throw error;

      toast({
        title: "Answer Submitted!",
        description: "Your answer has been recorded successfully.",
      });

      setAnswer('');
      // Wait for next question
      setCurrentQuestion(null);
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-6 rounded-lg">
              <p className="text-lg font-medium leading-relaxed">
                {currentQuestion.question_text}
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Select Your Answer</label>
              <div className="space-y-3">
                {[
                  { value: 'A', text: currentQuestion.option_a },
                  { value: 'B', text: currentQuestion.option_b },
                  { value: 'C', text: currentQuestion.option_c },
                  { value: 'D', text: currentQuestion.option_d }
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      answer === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={option.value}
                      checked={answer === option.value}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={submitting}
                      className="mt-1 h-4 w-4 text-primary"
                    />
                    <div className="flex-1">
                      <span className="font-semibold text-primary mr-2">{option.value}.</span>
                      <span className="text-foreground">{option.text}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmitAnswer}
              disabled={submitting}
              size="lg"
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;

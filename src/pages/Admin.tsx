import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Users, CheckCircle, XCircle, Trash2, Plus, Play, Pause, SkipForward, Award, Clock, Settings, Edit2, UserPlus, X, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Profile {
  id: string;
  full_name: string;
  grade: number;
  school: string;
  status: string;
  total_points: number;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  round_number: number;
  question_order: number;
  image_url?: string;
}

interface QuizSession {
  id: string;
  name: string | null;
  status: string;
  current_round: number;
  current_question_id: string | null;
  created_at: string;
  time_limit_seconds: number;
}

interface SessionUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  grade: number;
  school: string;
}

interface SessionQuestion {
  id: string;
  question_id: string;
  question_text: string | null;
  round_number: number;
  question_order: number;
}

interface QuestionResult {
  user_id: string;
  full_name: string;
  answer: string;
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  created_at: string;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pendingProfiles, setPendingProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [newTimeLimit, setNewTimeLimit] = useState<number>(60);
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [editingSessionName, setEditingSessionName] = useState<string | null>(null);
  const [sessionNameEdit, setSessionNameEdit] = useState<string>('');
  const [sessionUsers, setSessionUsers] = useState<Record<string, SessionUser[]>>({});
  const [sessionQuestions, setSessionQuestions] = useState<Record<string, SessionQuestion[]>>({});
  const [selectedSessionForUsers, setSelectedSessionForUsers] = useState<string | null>(null);
  const [selectedSessionForQuestions, setSelectedSessionForQuestions] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    round_number: 1,
    question_order: 1
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingProfiles();
      fetchAllProfiles();
      fetchQuestions();
      fetchSessions();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Fetch available users when opening user management dialog
    if (selectedSessionForUsers) {
      const fetchAvailableUsers = async () => {
        // Get all approved users
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'approved')
          .order('full_name', { ascending: true });

        // Get all users already assigned to any session
        const { data: assignedUsers } = await supabase
          .from('session_users')
          .select('user_id');

        const assignedUserIds = new Set(
          (assignedUsers || []).map(au => au.user_id)
        );

        // Filter out users already in sessions (except those in current session)
        const currentSessionUserIds = new Set(
          (sessionUsers[selectedSessionForUsers] || []).map(su => su.user_id)
        );

        const available = (allProfiles || []).filter(profile => {
          // Include if not in any session, or if already in current session
          return !assignedUserIds.has(profile.id) || currentSessionUserIds.has(profile.id);
        });

        setAvailableUsers(available);
      };
      fetchAvailableUsers();
    }
  }, [selectedSessionForUsers, sessionUsers]);

  const fetchPendingProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setPendingProfiles(data || []);
  };

  const fetchAllProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false });
    setAllProfiles(data || []);
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .order('round_number', { ascending: true })
      .order('question_order', { ascending: true });
    setQuestions(data || []);
  };

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    setSessions(data || []);
    
    // Fetch users and questions for all sessions
    if (data) {
      for (const session of data) {
        await fetchSessionUsers(session.id);
        await fetchSessionQuestions(session.id);
      }
    }
  };

  const fetchSessionUsers = async (sessionId: string) => {
    // First get session_users
    const { data: sessionUsersData, error: sessionUsersError } = await supabase
      .from('session_users')
      .select('id, user_id')
      .eq('session_id', sessionId);

    if (sessionUsersError || !sessionUsersData || sessionUsersData.length === 0) {
      setSessionUsers(prev => ({ ...prev, [sessionId]: [] }));
      return;
    }

    // Then get profiles for those users
    const userIds = sessionUsersData.map(su => su.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, grade, school')
      .in('id', userIds);

    // Combine the data
    const users: SessionUser[] = sessionUsersData.map((su) => {
      const profile = profilesData?.find(p => p.id === su.user_id);
      return {
        id: su.id,
        user_id: su.user_id,
        full_name: profile?.full_name || 'Unknown',
        email: '', // We'll need to fetch this separately if needed
        grade: profile?.grade || 0,
        school: profile?.school || 'Unknown'
      };
    });

    setSessionUsers(prev => ({ ...prev, [sessionId]: users }));
  };

  const fetchSessionQuestions = async (sessionId: string) => {
    const { data } = await supabase
      .from('session_questions')
      .select(`
        id,
        question_id,
        question_order,
        questions!session_questions_question_id_fkey (
          question_text,
          round_number
        )
      `)
      .eq('session_id', sessionId)
      .order('question_order', { ascending: true });

    if (data) {
      const sessionQs: SessionQuestion[] = data.map((item: any) => ({
        id: item.id,
        question_id: item.question_id,
        question_text: item.questions?.question_text || null,
        round_number: item.questions?.round_number || 1,
        question_order: item.question_order
      }));
      setSessionQuestions(prev => ({ ...prev, [sessionId]: sessionQs }));
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status: approved ? 'approved' : 'rejected' })
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update participant status',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Participant ${approved ? 'approved' : 'rejected'} successfully`
      });
      fetchPendingProfiles();
      fetchAllProfiles();
    }
  };

  const handleAddQuestion = async () => {
    // Allow either question_text OR image_file, but require options
    if ((!newQuestion.question_text && !imageFile) || !newQuestion.option_a || !newQuestion.option_b || 
        !newQuestion.option_c || !newQuestion.option_d) {
      toast({
        title: 'Error',
        description: 'Please provide a question (text or image) and all 4 options',
        variant: 'destructive'
      });
      return;
    }

    let imageUrl = '';

    // Upload image if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        toast({
          title: 'Error',
          description: 'Failed to upload image',
          variant: 'destructive'
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(filePath);

      imageUrl = publicUrl;
    }

    const { error } = await supabase
      .from('questions')
      .insert([{
        ...newQuestion,
        image_url: imageUrl || null
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add question',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Question added successfully'
      });
      setNewQuestion({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        round_number: 1,
        question_order: 1
      });
      setImageFile(null);
      setImagePreview('');
      fetchQuestions();
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Question deleted successfully'
      });
      fetchQuestions();
    }
  };

  const handleRemoveUser = async (userId: string) => {
    // Delete the user's profile (cascades to related data)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove user: ' + error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User removed successfully'
      });
      fetchAllProfiles();
      fetchPendingProfiles();
    }
  };

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a session name',
        variant: 'destructive'
      });
      return;
    }

    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert([{ 
        name: newSessionName.trim(),
        status: 'not_started', 
        current_round: 1, 
        time_limit_seconds: newTimeLimit 
      }])
      .select();

    if (error) {
      console.error('Session creation error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      toast({
        title: 'Error',
        description: error.message || error.details || 'Failed to create session. Check console for details.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Quiz session created successfully'
      });
      setNewSessionName('');
      fetchSessions();
    }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (!newName.trim()) {
      toast({
        title: 'Error',
        description: 'Session name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .update({ name: newName.trim() })
      .eq('id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to rename session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Session renamed successfully'
      });
      setEditingSessionName(null);
      fetchSessions();
    }
  };

  const handleResetSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to reset this quiz session? This will reset the status to "not_started", clear the current question, and delete all participant answers for this session.')) {
      return;
    }

    // First, delete all participant answers for this session
    console.log('Attempting to delete participant answers for session:', sessionId);
    const { data: deletedAnswers, error: answersError } = await supabase
      .from('participant_answers')
      .delete()
      .eq('session_id', sessionId)
      .select('id'); // Select to get count of deleted rows

    if (answersError) {
      console.error('Error deleting participant answers:', answersError);
      console.error('Error details:', {
        code: answersError.code,
        message: answersError.message,
        details: answersError.details,
        hint: answersError.hint
      });
      toast({
        title: 'Warning',
        description: `Failed to clear participant answers: ${answersError.message}. Please check RLS policies. Session will still be reset.`,
        variant: 'destructive'
      });
    } else {
      const deletedCount = deletedAnswers?.length || 0;
      console.log(`✅ Cleared ${deletedCount} participant answer(s) for session:`, sessionId);
      if (deletedCount > 0) {
        toast({
          title: 'Success',
          description: `Cleared ${deletedCount} participant answer(s)`,
          variant: 'default'
        });
      }
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'not_started',
        current_round: 1,
        current_question_id: null,
        question_start_time: null
      })
      .eq('id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to reset session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Quiz session reset successfully'
      });
      fetchSessions();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('quiz_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Session deleted successfully'
      });
      fetchSessions();
    }
  };

  const handleAddUserToSession = async (sessionId: string, userId: string) => {
    // First, check if user is already in another session
    const { data: existingAssignments, error: checkError } = await supabase
      .from('session_users')
      .select('id, session_id')
      .eq('user_id', userId);

    if (checkError) {
      toast({
        title: 'Error',
        description: 'Failed to check user assignments',
        variant: 'destructive'
      });
      return;
    }

    // Check if user is already in this session
    const alreadyInThisSession = existingAssignments?.some(a => a.session_id === sessionId);
    if (alreadyInThisSession) {
      toast({
        title: 'Error',
        description: 'User is already in this session',
        variant: 'destructive'
      });
      return;
    }

    // If user is in another session, remove them first
    if (existingAssignments && existingAssignments.length > 0) {
      const otherSessionIds = existingAssignments.map(a => a.session_id);
      const { error: removeError } = await supabase
        .from('session_users')
        .delete()
        .eq('user_id', userId);

      if (removeError) {
        toast({
          title: 'Error',
          description: 'Failed to remove user from previous session',
          variant: 'destructive'
        });
        return;
      }

      // Refresh the previous sessions
      for (const prevSessionId of otherSessionIds) {
        await fetchSessionUsers(prevSessionId);
      }
    }

    // Now add user to the new session
    const { error } = await supabase
      .from('session_users')
      .insert([{ session_id: sessionId, user_id: userId }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add user to session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: existingAssignments && existingAssignments.length > 0
          ? 'User moved to this session from another session'
          : 'User added to session successfully'
      });
      await fetchSessionUsers(sessionId);
      // Refresh all sessions to update user counts
      fetchSessions();
    }
  };

  const handleRemoveUserFromSession = async (sessionId: string, sessionUserId: string) => {
    const { error } = await supabase
      .from('session_users')
      .delete()
      .eq('id', sessionUserId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove user from session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'User removed from session successfully'
      });
      await fetchSessionUsers(sessionId);
    }
  };

  const handleAddQuestionToSession = async (sessionId: string, questionId: string) => {
    // Get the current max order for this session
    const currentQuestions = sessionQuestions[sessionId] || [];
    const maxOrder = currentQuestions.length > 0 
      ? Math.max(...currentQuestions.map(q => q.question_order))
      : 0;

    const { error } = await supabase
      .from('session_questions')
      .insert([{ 
        session_id: sessionId, 
        question_id: questionId,
        question_order: maxOrder + 1
      }]);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: 'Error',
          description: 'Question is already in this session',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add question to session',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: 'Success',
        description: 'Question added to session successfully'
      });
      await fetchSessionQuestions(sessionId);
    }
  };

  const handleRemoveQuestionFromSession = async (sessionId: string, sessionQuestionId: string) => {
    const { error } = await supabase
      .from('session_questions')
      .delete()
      .eq('id', sessionQuestionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove question from session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Question removed from session successfully'
      });
      await fetchSessionQuestions(sessionId);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
    // When starting a round, set the first question
    let updateData: any = { status };
    
    if (status === 'round_1' || status === 'round_2' || status === 'round_3' || status === 'finals') {
      // Determine the round number from the status
      const roundNumberMap: Record<string, number> = {
        'round_1': 1,
        'round_2': 2,
        'round_3': 3,
        'finals': 4
      };
      const roundNumber = roundNumberMap[status];
      
      // Fetch all questions for this session
      console.log('Fetching questions for session:', sessionId, 'round:', roundNumber);
      const { data: sessionQsData, error: fetchError } = await supabase
        .from('session_questions')
        .select('question_id')
        .eq('session_id', sessionId);

      if (fetchError) {
        console.error('Error fetching session questions:', fetchError);
        toast({
          title: 'Warning',
          description: 'Failed to fetch session questions. Starting session without a question.',
          variant: 'destructive'
        });
      } else if (!sessionQsData || sessionQsData.length === 0) {
        console.warn('No questions found for session:', sessionId);
        toast({
          title: 'Warning',
          description: 'No questions assigned to this session. Please add questions before starting.',
          variant: 'destructive'
        });
      } else {
        // Fetch the actual questions to filter by round and order
        const questionIds = sessionQsData.map(sq => sq.question_id);
        console.log('Session question IDs:', questionIds);
        
        // First, get ALL questions to see what we have
        const { data: allQuestionsData, error: allQuestionsError } = await supabase
          .from('questions')
          .select('id, round_number, question_order, question_text')
          .in('id', questionIds);
        
        if (allQuestionsError) {
          console.error('Error fetching all questions:', allQuestionsError);
        } else {
          console.log('All questions in session:', allQuestionsData);
          const round1Questions = allQuestionsData?.filter(q => q.round_number === roundNumber) || [];
          console.log(`Questions for round ${roundNumber}:`, round1Questions);
        }
        
        // Now get the first question for this round
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('id, round_number, question_order, question_text')
          .in('id', questionIds)
          .eq('round_number', roundNumber)
          .order('question_order', { ascending: true })
          .limit(1);

        if (questionsError) {
          console.error('Error fetching questions:', questionsError);
          toast({
            title: 'Error',
            description: `Failed to fetch questions: ${questionsError.message}`,
            variant: 'destructive'
          });
          return;
        }

        if (!questionsData || questionsData.length === 0) {
          console.warn('No questions found for round', roundNumber, 'in session:', sessionId);
          console.log('Available question IDs in session:', questionIds);
          toast({
            title: 'Warning',
            description: `No questions assigned to this session for ${status}. Please add questions for this round before starting.`,
            variant: 'destructive'
          });
        } else {
          const questionId = questionsData[0].id;
          const questionOrder = questionsData[0].question_order;
          
          console.log('✅ Found first question for round:', {
            questionId,
            roundNumber: questionsData[0].round_number,
            questionOrder,
            questionText: questionsData[0].question_text?.substring(0, 50) + '...',
            sessionId,
            note: 'Students will see this as Question 1 (sequential numbering per session)'
          });

          updateData.current_question_id = questionId;
          updateData.question_start_time = new Date().toISOString();
          console.log('✅ Setting first question:', {
            questionId,
            roundNumber: questionsData[0].round_number,
            questionOrder,
            sessionId,
            sequentialNumber: 1
          });
        }
      }
    }

    console.log('Updating session with data:', updateData);
    const { error, data } = await supabase
      .from('quiz_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select();

    if (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: `Failed to update session status: ${error.message}`,
        variant: 'destructive'
      });
    } else {
      console.log('Session updated successfully:', data);
      if (updateData.current_question_id) {
        toast({
          title: 'Success',
          description: `Session ${status} started with question ${updateData.current_question_id}`
        });
      } else {
        toast({
          title: 'Success',
          description: `Session ${status} successfully`
        });
      }
      fetchSessions();
    }
  };

  const handleNextQuestion = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.current_question_id) {
      toast({
        title: 'Error',
        description: 'No current question found',
        variant: 'destructive'
      });
      return;
    }

    // Get current question order
    const sessionQs = sessionQuestions[sessionId] || [];
    const currentQ = sessionQs.find(q => q.question_id === session.current_question_id);
    
    if (!currentQ) {
      toast({
        title: 'Error',
        description: 'Current question not found in session',
        variant: 'destructive'
      });
      return;
    }

    // Determine current round from session status
    let currentRound = 1;
    if (session.status === 'round_1') currentRound = 1;
    else if (session.status === 'round_2') currentRound = 2;
    else if (session.status === 'round_3') currentRound = 3;
    else if (session.status === 'finals') currentRound = 4;

    // Filter questions to only those in the current round
    const roundQuestions = sessionQs
      .filter(q => q.round_number === currentRound)
      .sort((a, b) => a.question_order - b.question_order);
    
    // Find next question within the current round
    const currentIndex = roundQuestions.findIndex(q => q.question_id === session.current_question_id);
    const nextQuestion = roundQuestions[currentIndex + 1];

    if (!nextQuestion) {
      // No more questions in current round
      toast({
        title: 'Round Complete',
        description: `Round ${currentRound} is complete. Click "Next Round" to proceed to the next round.`,
        variant: 'default'
      });
      return;
    }

    // Update session with next question
    const { error } = await supabase
      .from('quiz_sessions')
      .update({
        current_question_id: nextQuestion.question_id,
        question_start_time: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to move to next question',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Moved to next question'
      });
      fetchSessions();
    }
  };

  const handleUpdateTimeLimit = async (sessionId: string, timeLimit: number) => {
    const { error } = await supabase
      .from('quiz_sessions')
      .update({ time_limit_seconds: timeLimit })
      .eq('id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update time limit',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Time limit updated successfully'
      });
      fetchSessions();
    }
  };

  const fetchQuestionResults = async (sessionId: string) => {
    const { data } = await supabase
      .from('participant_answers')
      .select(`
        user_id,
        answer,
        is_correct,
        time_taken_ms,
        points_earned,
        created_at,
        profiles!participant_answers_user_id_fkey(full_name)
      `)
      .eq('session_id', sessionId)
      .order('is_correct', { ascending: false })
      .order('time_taken_ms', { ascending: true });

    if (data) {
      const results: QuestionResult[] = data.map((item: any) => ({
        user_id: item.user_id,
        full_name: item.profiles.full_name,
        answer: item.answer,
        is_correct: item.is_correct,
        time_taken_ms: item.time_taken_ms,
        points_earned: item.points_earned,
        created_at: item.created_at
      }));
      setQuestionResults(results);
    }
  };

  useEffect(() => {
    if (selectedSession) {
      fetchQuestionResults(selectedSession);
      // Refresh results every 5 seconds
      const interval = setInterval(() => {
        fetchQuestionResults(selectedSession);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow">
          <Trophy className="h-16 w-16 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage quiz participants, questions, and sessions</p>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="sessions">Quiz Control</TabsTrigger>
            <TabsTrigger value="results">Live Results</TabsTrigger>
            <TabsTrigger value="users">All Users</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pending Approvals ({pendingProfiles.length})
                </CardTitle>
                <CardDescription>Review and approve participant registrations</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingProfiles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending approvals</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingProfiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.full_name}</TableCell>
                          <TableCell>Grade {profile.grade}</TableCell>
                          <TableCell>{profile.school}</TableCell>
                          <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleApproval(profile.id, true)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproval(profile.id, false)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add New Question
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Round Number</Label>
                      <Select
                        value={newQuestion.round_number.toString()}
                        onValueChange={(value) => setNewQuestion({ ...newQuestion, round_number: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Round 1</SelectItem>
                          <SelectItem value="2">Round 2</SelectItem>
                          <SelectItem value="3">Round 3 (Semifinal)</SelectItem>
                          <SelectItem value="4">Round 4 (Final)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Question Order</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newQuestion.question_order}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question_order: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Question Text (or upload image below)</Label>
                    <Input
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                      placeholder="Enter question text (optional if image is provided)"
                    />
                  </div>
                  <div>
                    <Label>Question Image (optional)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="mt-4 relative">
                        <img 
                          src={imagePreview} 
                          alt="Question preview" 
                          className="max-h-48 rounded-lg border"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview('');
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Option A</Label>
                      <Input
                        value={newQuestion.option_a}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_a: e.target.value })}
                        placeholder="Enter option A"
                      />
                    </div>
                    <div>
                      <Label>Option B</Label>
                      <Input
                        value={newQuestion.option_b}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_b: e.target.value })}
                        placeholder="Enter option B"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Option C</Label>
                      <Input
                        value={newQuestion.option_c}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_c: e.target.value })}
                        placeholder="Enter option C"
                      />
                    </div>
                    <div>
                      <Label>Option D</Label>
                      <Input
                        value={newQuestion.option_d}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_d: e.target.value })}
                        placeholder="Enter option D"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Correct Answer</Label>
                    <Select
                      value={newQuestion.correct_answer}
                      onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Option A</SelectItem>
                        <SelectItem value="B">Option B</SelectItem>
                        <SelectItem value="C">Option C</SelectItem>
                        <SelectItem value="D">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddQuestion} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Questions ({questions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {questions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No questions added yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Round</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead>Options</TableHead>
                          <TableHead>Correct</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questions.map((question) => (
                          <TableRow key={question.id}>
                            <TableCell>Round {question.round_number}</TableCell>
                            <TableCell>#{question.question_order}</TableCell>
                            <TableCell className="max-w-md truncate">{question.question_text || '(Image Question)'}</TableCell>
                            <TableCell>
                              {question.image_url && (
                                <img 
                                  src={question.image_url} 
                                  alt="Question" 
                                  className="h-16 w-16 object-cover rounded"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="space-y-1">
                                <div>A: {question.option_a}</div>
                                <div>B: {question.option_b}</div>
                                <div>C: {question.option_c}</div>
                                <div>D: {question.option_d}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-primary">Option {question.correct_answer}</span>
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Delete Question</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to delete this question? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => {}}>Cancel</Button>
                                    <Button variant="destructive" onClick={() => handleDeleteQuestion(question.id)}>
                                      Delete
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Quiz Session Control
                </CardTitle>
                <CardDescription>Create and manage quiz sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Session Name</Label>
                    <Input
                      placeholder="Enter session name"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Default Timer (seconds)</Label>
                    <Input
                      type="number"
                      min="10"
                      max="300"
                      value={newTimeLimit}
                      onChange={(e) => setNewTimeLimit(parseInt(e.target.value) || 60)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleCreateSession} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Session
                    </Button>
                  </div>
                </div>

                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sessions created yet</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <Card key={session.id}>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  {editingSessionName === session.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={sessionNameEdit}
                                        onChange={(e) => setSessionNameEdit(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleRenameSession(session.id, sessionNameEdit);
                                          } else if (e.key === 'Escape') {
                                            setEditingSessionName(null);
                                          }
                                        }}
                                        className="flex-1"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleRenameSession(session.id, sessionNameEdit)}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingSessionName(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <h3 className="font-semibold text-lg">
                                        {session.name || `Session ${session.id.slice(0, 8)}...`}
                                      </h3>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingSessionName(session.id);
                                          setSessionNameEdit(session.name || '');
                                        }}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Status: <span className="font-medium">{session.status.toUpperCase()}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Current Round: {session.current_round}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-medium">Timer: {session.time_limit_seconds}s</span>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" variant="ghost">
                                        <Settings className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Update Timer Limit</DialogTitle>
                                        <DialogDescription>
                                          Set the time limit for questions in this session (in seconds)
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <Label>Time Limit (seconds)</Label>
                                        <Input
                                          type="number"
                                          min="10"
                                          max="300"
                                          defaultValue={session.time_limit_seconds}
                                          onChange={(e) => {
                                            const value = parseInt(e.target.value) || 60;
                                            e.currentTarget.dataset.value = value.toString();
                                          }}
                                        />
                                      </div>
                                      <DialogFooter>
                                        <Button
                                          onClick={(e) => {
                                            const input = (e.currentTarget.parentElement?.parentElement?.querySelector('input') as HTMLInputElement);
                                            const value = parseInt(input.value) || 60;
                                            handleUpdateTimeLimit(session.id, value);
                                          }}
                                        >
                                          Update
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setSelectedSessionForUsers(session.id)}
                                      >
                                        <Users className="h-4 w-4 mr-1" />
                                        Users ({sessionUsers[session.id]?.length || 0})
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Manage Users - {session.name || 'Session'}</DialogTitle>
                                        <DialogDescription>
                                          Add or remove users from this session
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div>
                                          <Label>Add User</Label>
                                          <Select
                                            onValueChange={(userId) => {
                                              handleAddUserToSession(session.id, userId);
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select a user to add" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableUsers
                                                .filter(user => !sessionUsers[session.id]?.some(su => su.user_id === user.id))
                                                .map((user) => {
                                                  // Check if user is in another session
                                                  const inOtherSession = Object.keys(sessionUsers).some(
                                                    sid => sid !== session.id && sessionUsers[sid]?.some(su => su.user_id === user.id)
                                                  );
                                                  return (
                                                    <SelectItem key={user.id} value={user.id}>
                                                      {user.full_name} - Grade {user.grade} - {user.school}
                                                      {inOtherSession && ' (will be moved from another session)'}
                                                    </SelectItem>
                                                  );
                                                })}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label>Session Users</Label>
                                          {sessionUsers[session.id] && sessionUsers[session.id].length > 0 ? (
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>Name</TableHead>
                                                  <TableHead>Grade</TableHead>
                                                  <TableHead>School</TableHead>
                                                  <TableHead>Actions</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {sessionUsers[session.id].map((su) => (
                                                  <TableRow key={su.id}>
                                                    <TableCell>{su.full_name}</TableCell>
                                                    <TableCell>Grade {su.grade}</TableCell>
                                                    <TableCell>{su.school}</TableCell>
                                                    <TableCell>
                                                      <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleRemoveUserFromSession(session.id, su.id)}
                                                      >
                                                        <X className="h-4 w-4" />
                                                      </Button>
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          ) : (
                                            <p className="text-sm text-muted-foreground py-4">No users in this session</p>
                                          )}
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => setSelectedSessionForQuestions(session.id)}
                                      >
                                        <Trophy className="h-4 w-4 mr-1" />
                                        Questions ({sessionQuestions[session.id]?.length || 0})
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                      <DialogHeader>
                                        <DialogTitle>Manage Questions - {session.name || 'Session'}</DialogTitle>
                                        <DialogDescription>
                                          Select which questions to include in this session
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div>
                                          <Label>Add Question</Label>
                                          <Select
                                            onValueChange={(questionId) => {
                                              handleAddQuestionToSession(session.id, questionId);
                                            }}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select a question to add" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {questions
                                                .filter(q => !sessionQuestions[session.id]?.some(sq => sq.question_id === q.id))
                                                .map((question) => (
                                                  <SelectItem key={question.id} value={question.id}>
                                                    Round {question.round_number} - Q{question.question_order}: {question.question_text || '(Image Question)'}
                                                  </SelectItem>
                                                ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          <Label>Session Questions</Label>
                                          {sessionQuestions[session.id] && sessionQuestions[session.id].length > 0 ? (
                                            <Table>
                                              <TableHeader>
                                                <TableRow>
                                                  <TableHead>Order</TableHead>
                                                  <TableHead>Round</TableHead>
                                                  <TableHead>Question</TableHead>
                                                  <TableHead>Actions</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {sessionQuestions[session.id]
                                                  .sort((a, b) => a.question_order - b.question_order)
                                                  .map((sq) => (
                                                    <TableRow key={sq.id}>
                                                      <TableCell>{sq.question_order}</TableCell>
                                                      <TableCell>Round {sq.round_number}</TableCell>
                                                      <TableCell className="max-w-md truncate">
                                                        {sq.question_text || '(Image Question)'}
                                                      </TableCell>
                                                      <TableCell>
                                                        <Button
                                                          size="sm"
                                                          variant="destructive"
                                                          onClick={() => handleRemoveQuestionFromSession(session.id, sq.id)}
                                                        >
                                                          <X className="h-4 w-4" />
                                                        </Button>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                              </TableBody>
                                            </Table>
                                          ) : (
                                            <p className="text-sm text-muted-foreground py-4">No questions in this session</p>
                                          )}
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end flex-wrap">
                              {(session.status !== 'not_started' || session.current_question_id) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResetSession(session.id)}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Reset Quiz
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSession(session.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                              {session.status === 'not_started' && (
                                <Button onClick={() => handleUpdateSessionStatus(session.id, 'round_1')}>
                                  <Play className="h-4 w-4 mr-1" />
                                  Start Round 1
                                </Button>
                              )}
                              {(session.status === 'round_1' || session.status === 'round_2' || session.status === 'round_3' || session.status === 'finals') && (
                                <>
                                  {session.current_question_id && (
                                    <Button onClick={() => handleNextQuestion(session.id)} variant="default">
                                      <SkipForward className="h-4 w-4 mr-1" />
                                      Next Question
                                    </Button>
                                  )}
                                  {session.status === 'round_1' && (
                                    <Button onClick={() => handleUpdateSessionStatus(session.id, 'round_2')} variant="secondary">
                                      <SkipForward className="h-4 w-4 mr-1" />
                                      Next Round
                                    </Button>
                                  )}
                                  {session.status === 'round_2' && (
                                    <Button onClick={() => handleUpdateSessionStatus(session.id, 'round_3')} variant="secondary">
                                      <SkipForward className="h-4 w-4 mr-1" />
                                      Next Round
                                    </Button>
                                  )}
                                  {session.status === 'round_3' && (
                                    <Button onClick={() => handleUpdateSessionStatus(session.id, 'finals')} variant="secondary">
                                      <SkipForward className="h-4 w-4 mr-1" />
                                      Start Finals
                                    </Button>
                                  )}
                                  <Button variant="outline" onClick={() => handleUpdateSessionStatus(session.id, 'completed')}>
                                    End Quiz
                                  </Button>
                                </>
                              )}
                              {session.status === 'finals' && !session.current_question_id && (
                                <Button onClick={() => handleUpdateSessionStatus(session.id, 'completed')}>
                                  <Award className="h-4 w-4 mr-1" />
                                  Complete Quiz
                                </Button>
                              )}
                              {session.status === 'completed' && (
                                <span className="text-sm text-muted-foreground">Quiz completed</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Live Results - Who Answered Correctly & Quickly
                </CardTitle>
                <CardDescription>
                  {selectedSession 
                    ? `Showing results for "${sessions.find(s => s.id === selectedSession)?.name || 'Session'}" (updates every 5 seconds)`
                    : 'Select a session to view results'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Label>Select Session</Label>
                  <Select 
                    value={selectedSession || ''} 
                    onValueChange={(value) => setSelectedSession(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a session..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.name || `Session ${session.id.slice(0, 8)}...`} - {session.status.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedSession ? (
                  <p className="text-center text-muted-foreground py-8">Select a session above to view results</p>
                ) : questionResults.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No answers submitted yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Participant</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead>Correct</TableHead>
                        <TableHead>Time Taken</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Submitted At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questionResults.map((result, index) => (
                        <TableRow key={`${result.user_id}-${result.created_at}`} className={result.is_correct ? 'bg-green-50' : ''}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {result.is_correct && index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                              {result.is_correct && index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                              {result.is_correct && index === 2 && <Trophy className="h-5 w-5 text-amber-600" />}
                              <span className="font-bold">#{index + 1}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{result.full_name}</TableCell>
                          <TableCell>
                            <span className="font-semibold">{result.answer}</span>
                          </TableCell>
                          <TableCell>
                            {result.is_correct ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{(result.time_taken_ms / 1000).toFixed(2)}s</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-bold text-primary">{result.points_earned}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(result.created_at).toLocaleTimeString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users ({allProfiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allProfiles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users registered yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProfiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.full_name}</TableCell>
                          <TableCell>Grade {profile.grade}</TableCell>
                          <TableCell>{profile.school}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              profile.status === 'approved' ? 'bg-green-100 text-green-800' :
                              profile.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {profile.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Remove User</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to remove <strong>{profile.full_name}</strong> from the game? This will delete their profile and all associated data. This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline">Cancel</Button>
                                  <Button variant="destructive" onClick={() => handleRemoveUser(profile.id)}>
                                    Remove User
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Leaderboard
                </CardTitle>
                <CardDescription>Top performers in the quiz competition</CardDescription>
              </CardHeader>
              <CardContent>
                {allProfiles.filter(p => p.status === 'approved').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No approved participants yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allProfiles
                        .filter(p => p.status === 'approved')
                        .sort((a, b) => b.total_points - a.total_points)
                        .map((profile, index) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                                {index === 1 && <Trophy className="h-5 w-5 text-gray-400" />}
                                {index === 2 && <Trophy className="h-5 w-5 text-amber-600" />}
                                <span className="font-bold">#{index + 1}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{profile.full_name}</TableCell>
                            <TableCell>Grade {profile.grade}</TableCell>
                            <TableCell>{profile.school}</TableCell>
                            <TableCell className="font-bold text-primary">{profile.total_points}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;

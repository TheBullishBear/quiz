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
import { Trophy, Users, CheckCircle, XCircle, Trash2, Plus, Play, Pause, SkipForward, Award } from 'lucide-react';
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
  correct_answer: string;
  round_number: number;
  question_order: number;
}

interface QuizSession {
  id: string;
  status: string;
  current_round: number;
  current_question_id: string | null;
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
  
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    correct_answer: '',
    round_number: 1,
    question_order: 1
  });

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
    if (!newQuestion.question_text || !newQuestion.correct_answer) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase
      .from('questions')
      .insert([newQuestion]);

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
        correct_answer: '',
        round_number: 1,
        question_order: 1
      });
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

  const handleCreateSession = async () => {
    const { error } = await supabase
      .from('quiz_sessions')
      .insert([{ status: 'not_started', current_round: 1 }]);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create session',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Quiz session created successfully'
      });
      fetchSessions();
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: string) => {
    const { error } = await supabase
      .from('quiz_sessions')
      .update({ status })
      .eq('id', sessionId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update session status',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Session ${status} successfully`
      });
      fetchSessions();
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="sessions">Quiz Control</TabsTrigger>
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
                    <Label>Question Text</Label>
                    <Input
                      value={newQuestion.question_text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                      placeholder="Enter question text"
                    />
                  </div>
                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      value={newQuestion.correct_answer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                      placeholder="Enter correct answer"
                    />
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
                          <TableHead>Answer</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {questions.map((question) => (
                          <TableRow key={question.id}>
                            <TableCell>Round {question.round_number}</TableCell>
                            <TableCell>#{question.question_order}</TableCell>
                            <TableCell className="max-w-md truncate">{question.question_text}</TableCell>
                            <TableCell>{question.correct_answer}</TableCell>
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
                <Button onClick={handleCreateSession} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Session
                </Button>

                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sessions created yet</p>
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <Card key={session.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold">Session ID: {session.id.slice(0, 8)}...</p>
                              <p className="text-sm text-muted-foreground">
                                Status: <span className="font-medium">{session.status.toUpperCase()}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Current Round: {session.current_round}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {session.status === 'not_started' && (
                                <Button onClick={() => handleUpdateSessionStatus(session.id, 'round_1')}>
                                  <Play className="h-4 w-4 mr-1" />
                                  Start Round 1
                                </Button>
                              )}
                              {session.status === 'round_1' && (
                                <>
                                  <Button onClick={() => handleUpdateSessionStatus(session.id, 'round_2')}>
                                    <SkipForward className="h-4 w-4 mr-1" />
                                    Next Round
                                  </Button>
                                  <Button variant="outline" onClick={() => handleUpdateSessionStatus(session.id, 'completed')}>
                                    End Quiz
                                  </Button>
                                </>
                              )}
                              {session.status === 'round_2' && (
                                <>
                                  <Button onClick={() => handleUpdateSessionStatus(session.id, 'round_3')}>
                                    <SkipForward className="h-4 w-4 mr-1" />
                                    Next Round
                                  </Button>
                                  <Button variant="outline" onClick={() => handleUpdateSessionStatus(session.id, 'completed')}>
                                    End Quiz
                                  </Button>
                                </>
                              )}
                              {session.status === 'round_3' && (
                                <>
                                  <Button onClick={() => handleUpdateSessionStatus(session.id, 'finals')}>
                                    <SkipForward className="h-4 w-4 mr-1" />
                                    Start Finals
                                  </Button>
                                  <Button variant="outline" onClick={() => handleUpdateSessionStatus(session.id, 'completed')}>
                                    End Quiz
                                  </Button>
                                </>
                              )}
                              {session.status === 'finals' && (
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
                        <TableHead>Points</TableHead>
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
                          <TableCell className="font-bold text-primary">{profile.total_points}</TableCell>
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

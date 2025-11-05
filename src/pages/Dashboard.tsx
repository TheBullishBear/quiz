import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Trophy, Users, Clock, Award } from 'lucide-react';

const Dashboard = () => {
  const { user, isAdmin, isApproved, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchActiveSession();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(data);
  };

  const fetchActiveSession = async () => {
    const { data } = await supabase
      .from('quiz_sessions')
      .select('*')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setActiveSession(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
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

  if (!isApproved && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <Clock className="h-16 w-16 text-accent mx-auto mb-4 animate-pulse" />
            <CardTitle className="text-2xl">Approval Pending</CardTitle>
            <CardDescription>
              Your registration is under review. Please wait for admin approval to participate in the quiz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Name:</strong> {profile?.full_name}</p>
              <p><strong>Grade:</strong> {profile?.grade}</p>
              <p><strong>School:</strong> {profile?.school}</p>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="w-full mt-6">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Quiz Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Welcome back, {profile?.full_name}!</p>
          </div>
          <div className="flex gap-4">
            {isAdmin && (
              <Button onClick={() => navigate('/admin')} variant="secondary">
                Admin Panel
              </Button>
            )}
            <Button onClick={handleSignOut} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Trophy className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{profile?.total_points || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-secondary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grade</CardTitle>
              <Award className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">Grade {profile?.grade}</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Status</CardTitle>
              <Users className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-accent">
                {activeSession ? activeSession.status.replace('_', ' ').toUpperCase() : 'NO ACTIVE QUIZ'}
              </div>
            </CardContent>
          </Card>
        </div>

        {activeSession && (
          <Card className="shadow-xl animate-pulse-glow">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Active Quiz Session
              </CardTitle>
              <CardDescription>Join the competition now!</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate('/quiz')}
              >
                Enter Quiz Arena
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

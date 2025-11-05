import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles, Zap, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import heroImage from '@/assets/quiz-hero.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/30 via-background to-secondary/30">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Kids participating in quiz competition"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Quiz Competition 2024</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Ultimate Quiz
              </span>
              <br />
              <span className="text-foreground">Challenge</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Join the most exciting quiz competition for students from Grade 8 to 12!
              Test your knowledge, compete with peers, and win amazing prizes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
                onClick={() => navigate('/auth')}
              >
                <Trophy className="mr-2 h-5 w-5" />
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            How It <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Works</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center space-y-4 p-6 rounded-2xl bg-card shadow-lg border border-primary/10 hover:shadow-xl transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Register & Get Approved</h3>
              <p className="text-muted-foreground">
                Create your account with school details and wait for admin approval to join the competition.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-card shadow-lg border border-secondary/10 hover:shadow-xl transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mx-auto">
                <Zap className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="text-xl font-bold">Compete in Rounds</h3>
              <p className="text-muted-foreground">
                Answer questions quickly and correctly to earn points and advance through multiple rounds.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-card shadow-lg border border-accent/10 hover:shadow-xl transition-shadow">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mx-auto">
                <Trophy className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold">Win Prizes</h3>
              <p className="text-muted-foreground">
                Top performers advance to finals and compete in teams for the ultimate victory!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Show Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Knowledge?</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of students competing for glory. Sign up now and prove you're the best!
          </p>
          <Button
            size="lg"
            className="text-lg px-12 shadow-xl hover:shadow-2xl transition-all animate-pulse-glow"
            onClick={() => navigate('/auth')}
          >
            <Sparkles className="mr-2 h-5 w-5" />
            Join Competition
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;

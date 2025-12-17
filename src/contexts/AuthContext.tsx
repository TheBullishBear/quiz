import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isApproved: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isApproved: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) return;
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            setTimeout(() => {
              checkUserRole(session.user.id);
              checkApprovalStatus(session.user.id);
            }, 0);
          } else {
            setIsAdmin(false);
            setIsApproved(false);
          }
        }
      );

      supabase.auth.getSession()
        .then(({ data: { session }, error }) => {
          if (!mounted) return;
          if (error) {
            console.error('Error getting session:', error);
            setLoading(false);
            return;
          }
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            checkUserRole(session.user.id);
            checkApprovalStatus(session.user.id);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error initializing auth:', error);
          if (mounted) {
            setLoading(false);
          }
        });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth:', error);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
  }, []);

  const checkUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();
    
    setIsAdmin(!!data);
  };

  const checkApprovalStatus = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();
    
    setIsApproved(data?.status === 'approved');
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isApproved, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, Loader2, AlertCircle, Database, Key, Globe, Shield } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

const ConnectionTest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [envVars, setEnvVars] = useState<{ [key: string]: string | undefined }>({});

  useEffect(() => {
    // Check environment variables (only what's available in client)
    setEnvVars({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '***' + import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY.slice(-4) : undefined,
    });
  }, []);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (index: number, updates: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r));
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    
    // Use a counter to track test indices since results array is cleared
    let testIndex = 0;

    // Test 1: Environment Variables
    addResult({
      name: 'Environment Variables',
      status: 'pending',
      message: 'Checking environment variables...',
    });
    const envTestIndex = testIndex++;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      updateResult(envTestIndex, {
        status: 'error',
        message: 'Missing environment variables',
        details: `Missing: ${!supabaseUrl ? 'VITE_SUPABASE_URL' : ''} ${!supabaseKey ? 'VITE_SUPABASE_PUBLISHABLE_KEY' : ''}`.trim(),
      });
      setIsRunning(false);
      return;
    }

    updateResult(envTestIndex, {
      status: 'success',
      message: 'Environment variables configured',
      details: `URL: ${supabaseUrl}`,
    });

    // Test 2: Supabase Client Initialization
    addResult({
      name: 'Supabase Client',
      status: 'pending',
      message: 'Testing client initialization...',
    });
    const clientTestIndex = testIndex++;

    try {
      if (!supabase) {
        throw new Error('Supabase client is null or undefined');
      }
      updateResult(clientTestIndex, {
        status: 'success',
        message: 'Supabase client initialized successfully',
      });
    } catch (error: any) {
      updateResult(clientTestIndex, {
        status: 'error',
        message: 'Failed to initialize Supabase client',
        details: error.message,
      });
      setIsRunning(false);
      return;
    }

    // Test 3: Authentication Connection
    addResult({
      name: 'Authentication Service',
      status: 'pending',
      message: 'Testing authentication connection...',
    });
    const authTestIndex = testIndex++;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      updateResult(authTestIndex, {
        status: 'success',
        message: 'Authentication service connected',
        details: session ? 'Active session found' : 'No active session',
      });
    } catch (error: any) {
      updateResult(authTestIndex, {
        status: 'error',
        message: 'Failed to connect to authentication service',
        details: error.message || 'Unknown error',
      });
    }

    // Test 4: Database Connection - Profiles Table
    addResult({
      name: 'Database Connection',
      status: 'pending',
      message: 'Testing database connection...',
    });
    const dbTestIndex = testIndex++;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        // Check if it's a permission error (RLS) vs connection error
        if (error.code === 'PGRST116' || error.message?.includes('permission')) {
          updateResult(dbTestIndex, {
            status: 'success',
            message: 'Database connected (RLS blocking query - expected)',
            details: 'Connection works, but RLS policies require authentication',
          });
        } else {
          throw error;
        }
      } else {
        updateResult(dbTestIndex, {
          status: 'success',
          message: 'Database connected successfully',
          details: data ? 'Query executed successfully' : 'No data returned',
        });
      }
    } catch (error: any) {
      updateResult(dbTestIndex, {
        status: 'error',
        message: 'Failed to connect to database',
        details: error.message || 'Unknown error',
      });
    }

    // Test 5: Network Connectivity
    addResult({
      name: 'Network Connectivity',
      status: 'pending',
      message: 'Testing network connection to Supabase...',
    });
    const networkTestIndex = testIndex++;

    try {
      const startTime = Date.now();
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
        },
      });
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (response.ok || response.status === 404) {
        // 404 is fine, it means we reached the server
        updateResult(networkTestIndex, {
          status: 'success',
          message: 'Network connection successful',
          details: `Latency: ${latency}ms`,
        });
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      updateResult(networkTestIndex, {
        status: 'error',
        message: 'Network connection failed',
        details: error.message || 'Cannot reach Supabase server',
      });
    }

    // Test 6: Test Query with Authentication (if logged in)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      addResult({
        name: 'Authenticated Query',
        status: 'pending',
        message: 'Testing authenticated database query...',
      });
      const authQueryTestIndex = testIndex++;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, status')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        updateResult(authQueryTestIndex, {
          status: 'success',
          message: 'Authenticated query successful',
          details: `Profile: ${data?.full_name || 'N/A'} (${data?.status || 'N/A'})`,
        });
      } catch (error: any) {
        updateResult(authQueryTestIndex, {
          status: 'error',
          message: 'Authenticated query failed',
          details: error.message || 'Unknown error',
        });
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500">Testing...</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalTests = results.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Database className="h-8 w-8 text-primary" />
                  Supabase Connection Test
                </CardTitle>
                <CardDescription>
                  Verify that your Vercel deployment is properly connected to Supabase
                </CardDescription>
              </div>
              <Button onClick={runTests} disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Run Tests
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Variables Display */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Environment Variables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-sm">VITE_SUPABASE_URL</span>
                    <Badge variant={envVars.VITE_SUPABASE_URL ? "default" : "destructive"}>
                      {envVars.VITE_SUPABASE_URL ? 'Set' : 'Missing'}
                    </Badge>
                  </div>
                  {envVars.VITE_SUPABASE_URL && (
                    <div className="text-xs text-muted-foreground pl-2">
                      {envVars.VITE_SUPABASE_URL}
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-sm">VITE_SUPABASE_PUBLISHABLE_KEY</span>
                    <Badge variant={envVars.VITE_SUPABASE_PUBLISHABLE_KEY ? "default" : "destructive"}>
                      {envVars.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Missing'}
                    </Badge>
                  </div>
                  {envVars.VITE_SUPABASE_PUBLISHABLE_KEY && (
                    <div className="text-xs text-muted-foreground pl-2">
                      {envVars.VITE_SUPABASE_PUBLISHABLE_KEY}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Test Results Summary */}
            {totalTests > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Test Results
                  </CardTitle>
                  <CardDescription>
                    {successCount} passed, {errorCount} failed out of {totalTests} tests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <span className="font-semibold">{result.name}</span>
                          </div>
                          {getStatusBadge(result.status)}
                        </div>
                        <p className="text-sm text-muted-foreground ml-7">
                          {result.message}
                        </p>
                        {result.details && (
                          <div className="ml-7 text-xs font-mono bg-muted p-2 rounded">
                            {result.details}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {totalTests === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How to Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>Click the "Run Tests" button to verify your Supabase connection.</p>
                  <p>The tests will check:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Environment variables configuration</li>
                    <li>Supabase client initialization</li>
                    <li>Authentication service connectivity</li>
                    <li>Database connection</li>
                    <li>Network connectivity</li>
                    <li>Authenticated queries (if logged in)</li>
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Troubleshooting */}
            {errorCount > 0 && (
              <Card className="border-yellow-500">
                <CardHeader>
                  <CardTitle className="text-lg text-yellow-600">Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>If tests are failing, check:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Environment variables are set in Vercel with <code className="bg-muted px-1 rounded">VITE_</code> prefix</li>
                    <li>Variables are set for Production environment</li>
                    <li>Supabase project URL and keys are correct</li>
                    <li>Supabase project is active and not paused</li>
                    <li>Network/firewall allows connections to Supabase</li>
                  </ul>
                  <p className="mt-4">
                    See <code className="bg-muted px-1 rounded">docs/VERCEL_DEPLOYMENT.md</code> for detailed instructions.
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectionTest;


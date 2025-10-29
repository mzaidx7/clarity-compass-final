'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/use-auth';
import { Brain, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const devLoginSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
});

type DevLoginFormValues = z.infer<typeof devLoginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [devLoginError, setDevLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<DevLoginFormValues>({
    resolver: zodResolver(devLoginSchema),
    defaultValues: {
      user_id: 'student_demo'
    }
  });

  const onDevLogin = async (data: DevLoginFormValues) => {
    setIsLoading(true);
    setDevLoginError(null);
    try {
      await login(data);
    } catch (error) {
      setDevLoginError('Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 opacity-20 blur-xl" />
              <div className="relative rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 p-4">
                <Brain className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
            ClarityCompass
          </h1>
          <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Powered Burnout Prevention
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl font-semibold tracking-tight text-slate-100">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              Sign in to continue your wellness journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onDevLogin)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="user_id" className="text-sm font-medium text-slate-200">
                  User ID
                </Label>
                <Input 
                  id="user_id" 
                  {...register('user_id')}
                  placeholder="Enter your user ID"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                  disabled={isLoading}
                />
                {errors.user_id && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    {errors.user_id.message}
                  </p>
                )}
                {devLoginError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    {devLoginError}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Dev Mode Notice */}
            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-800/30 p-3">
              <p className="text-center text-xs text-slate-400">
                <span className="font-semibold text-cyan-400">Development Mode</span>
                <br />
                Use any user ID to sign in (e.g., "student_demo")
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Track • Predict • Prevent Burnout
        </p>
      </div>
    </div>
  );
}

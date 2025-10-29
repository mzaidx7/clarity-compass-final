"use client";

import { useState, useEffect } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import { api, apiSafe } from '@/lib/api';
import { clamp, roundDisplay, levelToColor } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import type { PredictionResponse, SurveyRequest } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

const quickRiskSchema = z.object({
  sleep_hours: z.coerce.number().min(0).max(24),
  study_hours: z.coerce.number().min(0).max(24),
  assignments_due: z.coerce.number().int().min(0),
  exams_within_7d: z.coerce.number().int().min(0),
  stress_level: z.coerce.number().int().min(1).max(5),
  social_support: z.coerce.number().int().min(1).max(5),
  physical_activity: z.coerce.number().min(0).max(20),
});

type QuickRiskFormValues = z.infer<typeof quickRiskSchema>;

export default function QuickRiskPage() {
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickRiskHistory, setQuickRiskHistory] = useState<Array<{timestamp: string, score: number}>>([]);
  const [lastFullAssessment, setLastFullAssessment] = useState<{date: string, daysSince: number} | null>(null);
  const [showSmartPrompt, setShowSmartPrompt] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<QuickRiskFormValues>({
    resolver: zodResolver(quickRiskSchema),
    defaultValues: {
      sleep_hours: 7,
      study_hours: 4,
      assignments_due: 2,
      exams_within_7d: 1,
      stress_level: 3,
      social_support: 3,
      physical_activity: 3,
    },
  });

  // Load quick risk history and check for full assessment
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await apiSafe.history();
        if (!result.error && result.data) {
          // Filter quick risk entries (not full assessments)
          const quickRisks = result.data.items
            .filter(item => !item.type || item.type !== 'burnout_assessment')
            .filter(item => item.result && typeof item.result.burnout_score === 'number')
            .map(item => ({
              timestamp: item.timestamp,
              score: item.result?.burnout_score || 0
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 14); // Last 14 quick checks
          
          setQuickRiskHistory(quickRisks);

          // Check for recent high scores (3+ high scores in last 7 days)
          const last7Days = quickRisks.slice(0, 7);
          const highScores = last7Days.filter(q => q.score >= 50).length;
          if (highScores >= 3) {
            setShowSmartPrompt(true);
          }

          // Check last full assessment
          const lastAssessment = result.data.items
            .filter(item => item.type === 'burnout_assessment')
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
          
          if (lastAssessment) {
            const daysSince = Math.floor((Date.now() - new Date(lastAssessment.timestamp).getTime()) / (1000 * 60 * 60 * 24));
            setLastFullAssessment({
              date: new Date(lastAssessment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              daysSince
            });
            // Show prompt if last assessment was >14 days ago
            if (daysSince > 14) {
              setShowSmartPrompt(true);
            }
          } else {
            // No full assessment ever taken
            setShowSmartPrompt(true);
          }
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      }
    };

    loadHistory();
  }, []);

  const onSubmit = async (data: QuickRiskFormValues) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const result = await api.predict(data);
      const clamped = clamp(result.burnout_score);
      setPrediction({ ...result, burnout_score: Number(clamped.toFixed(2)) });
    } catch (e) {
      setError("An error occurred while fetching the prediction.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSave = async () => {
    setIsSaving(true);
    const data = form.getValues();
    try {
      const response = await api.saveSurveyFull({ input: data, result: prediction ? { ...prediction, burnout_score: Number(prediction.burnout_score.toFixed(2)) } as any : null, timestamp: new Date().toISOString() });
      // Also persist to local history for Progress page
      try {
        const key = user?.id ? `cc_history_${user.id}` : `cc_history_local`;
        const now = new Date().toISOString();
        const entry = { timestamp: now, input: data, result: prediction };
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(entry);
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}
      toast({ title: "Saved ✅", description: response.message });
      
      // Reload history after saving
      if (prediction) {
        setQuickRiskHistory(prev => [{
          timestamp: new Date().toISOString(),
          score: prediction.burnout_score
        }, ...prev].slice(0, 14));
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the assessment. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  const getRiskColor = (risk: 'Low' | 'Moderate' | 'High') => levelToColor(risk as any).text;

  return (
    <div className="container mx-auto max-w-4xl p-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Quick Risk Assessment</h1>
        <p className="text-muted-foreground">Enter your recent activity to get a quick estimate of your burnout risk.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle>Your Inputs</CardTitle>
                <CardDescription>7 factors for enhanced burnout prediction.</CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help ml-2" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm p-3">
                    <div className="space-y-1.5">
                      <p className="text-xs"><strong>Sleep hours:</strong> Avg. hours per night (last 24h)</p>
                      <p className="text-xs"><strong>Study hours:</strong> Active study time per day</p>
                      <p className="text-xs"><strong>Assignments due:</strong> Due in next 7 days</p>
                      <p className="text-xs"><strong>Exams within 7d:</strong> Scheduled in next week</p>
                      <p className="text-xs"><strong>Stress level:</strong> Overall stress (1=low, 5=high)</p>
                      <p className="text-xs"><strong>Social support:</strong> Quality of support (1=poor, 5=excellent)</p>
                      <p className="text-xs"><strong>Physical activity:</strong> Hours of exercise per week</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    {Object.keys(form.getValues()).map((key) => {
                        const fieldName = key as keyof QuickRiskFormValues;
                        return (
                            <div key={fieldName} className="space-y-2">
                                <Label htmlFor={fieldName} className="capitalize">{fieldName.replace(/_/g, ' ')}</Label>
                                <Controller
                                    name={fieldName}
                                    control={form.control}
                                    render={({ field }) => (
                                        <Input id={fieldName} type="number" {...field} />
                                    )}
                                />
                                {form.formState.errors[fieldName] && <p className="text-sm text-destructive">{form.formState.errors[fieldName]?.message}</p>}
                            </div>
                        )
                    })}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Predict Risk
                </Button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Prediction Results</CardTitle>
            <CardDescription>Your calculated burnout risk based on your inputs.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {error && <div className="text-center text-destructive"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>}
            {!isLoading && !error && !prediction && <p className="text-muted-foreground">Results will be shown here.</p>}
            {prediction && (
              <div className="w-full space-y-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Burnout Score</p>
                  <p className={`text-6xl font-bold ${getRiskColor(prediction.risk_label)}`}>
                    {roundDisplay(prediction.burnout_score)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <p className={`text-2xl font-semibold ${getRiskColor(prediction.risk_label)}`}>
                    {prediction.risk_label}
                  </p>
                  {prediction.using_model === false && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">⚠️ Using heuristic</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Top Drivers</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {prediction.top_drivers.length > 0 ? prediction.top_drivers.map(driver => (
                      <Badge key={driver} variant="secondary">{driver}</Badge>
                    )) : <p className="text-sm text-muted-foreground">No specific drivers identified.</p>}
                  </div>
                </div>
                
                {/* Smart Prompt for Full Assessment */}
                {showSmartPrompt && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div className="text-left flex-1">
                          <p className="text-sm font-semibold text-foreground">Want a More Accurate Assessment?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {!lastFullAssessment 
                              ? "You haven't taken a full burnout assessment yet. Our ML model offers 86% accuracy with deeper insights."
                              : lastFullAssessment.daysSince > 14
                              ? `Your last full assessment was ${lastFullAssessment.daysSince} days ago. A fresh assessment provides more accurate tracking.`
                              : "Quick checks are helpful, but our comprehensive assessment provides much deeper analysis with 19 questions and ML-powered predictions."}
                          </p>
                        </div>
                      </div>
                      <Link href="/assessment">
                        <Button className="w-full bg-gradient-primary" size="sm">
                          Take Full Burnout Assessment
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}

                <Button onClick={onSave} className="w-full" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Quick Check
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Check History Chart */}
      {quickRiskHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Quick Check History
                </CardTitle>
                <CardDescription>Last {quickRiskHistory.length} quick risk assessments</CardDescription>
              </div>
              {lastFullAssessment && (
                <Badge variant="outline" className="text-xs">
                  Last full assessment: {lastFullAssessment.date}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer 
              config={{
                score: {
                  label: "Quick Risk Score",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={quickRiskHistory.slice().reverse().map((item, idx) => ({
                    index: idx + 1,
                    score: item.score,
                    label: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }))} 
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradientScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    ticks={[0, 25, 50, 75, 100]}
                    width={35}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const riskLevel = data.score >= 70 ? 'Severe' : data.score >= 50 ? 'High' : data.score >= 30 ? 'Moderate' : 'Low';
                        const riskColor = data.score >= 70 ? 'text-red-500' : data.score >= 50 ? 'text-orange-500' : data.score >= 30 ? 'text-yellow-500' : 'text-green-500';
                        return (
                          <div className="bg-background/95 backdrop-blur border-2 border-border rounded-lg shadow-lg p-3">
                            <p className="text-sm font-medium mb-1">{data.label}</p>
                            <p className={`text-xl font-bold ${riskColor}`}>
                              {Math.round(data.score)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {riskLevel} Risk
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#gradientScore)"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Quick checks are great for daily monitoring, but they're estimates based on 7 simple inputs. 
                For the most accurate burnout assessment, use our <Link href="/assessment" className="text-primary hover:underline font-medium">Full Burnout Assessment</Link> which uses an 86% accurate ML model with 19 comprehensive questions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

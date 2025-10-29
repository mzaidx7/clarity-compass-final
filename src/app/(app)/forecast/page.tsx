"use client";

import { useEffect, useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, TrendingUp, Calendar, Sparkles, Activity } from 'lucide-react';
import { api, apiSafe } from '@/lib/api';
import type { ForecastResponse, ForecastRequest } from '@/lib/types';
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line, LineChart, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const forecastSchema = z.object({
  last14: z.array(z.number().min(0).max(100)).length(14, "Must have 14 values"),
  deadlines_next7: z.array(z.number().min(0).max(10)).length(7, "Must have 7 values"),
});

type ForecastFormValues = z.infer<typeof forecastSchema>;

const chartConfig = {
  prediction: { label: 'Predicted Risk', color: 'hsl(var(--primary))' },
  confidence: { label: 'Confidence Range', color: 'hsl(var(--accent))' },
} satisfies ChartConfig;

export default function ForecastPage() {
  const [prediction, setPrediction] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');

  const form = useForm<ForecastFormValues>({
    resolver: zodResolver(forecastSchema),
    defaultValues: {
        last14: [50,52,55,53,56,58,60,62,65,63,66,68,70,72],
        deadlines_next7: [0,1,0,2,0,1,0],
    },
  });

  const onSubmit = async (data: ForecastFormValues) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      const result = await api.forecast(data);
      setPrediction(result);
    } catch (e) {
      setError("An error occurred while fetching the forecast.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Use My Data with better calendar integration
  const useMyData = async () => {
    setLoadingData(true);
    setActiveTab('auto');
    try {
      const hist = await apiSafe.history(28);
      const items = hist.data?.items || [];
      
      // Enhanced score prioritization: Assessment > Fused > Quick Risk
      const scores = items
        .map(it => {
          // Check for new burnout assessment
          if ((it as any).type === 'burnout_assessment') {
            return Number((it as any).result?.burnout_score ?? 0);
          }
          // Then fused scores
          const fusedScore = it.fused?.final_score_0_100;
          if (fusedScore != null) return Number(fusedScore);
          // Finally quick risk
          const quickScore = it.result?.burnout_score;
          if (quickScore != null) return Number(quickScore);
          return null;
        })
        .filter((n): n is number => n !== null && !Number.isNaN(n));
      
      // Fill last 14 days (reverse chronological)
      const last14 = Array(14).fill(0);
      for (let i = 0; i < 14; i++) {
        last14[13 - i] = scores[scores.length - 1 - i] ?? 0;
      }
      
      // Enhanced calendar-based deadline calculation with priority weighting
      const deadlines = Array(7).fill(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const calendarResult = await apiSafe.calendarList();
      const allEvents = calendarResult.data || [];
      
      for (let i = 0; i < 7; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        const targetDateStr = targetDate.toISOString().slice(0, 10);
        
        // Filter events for this day and calculate weighted count
        const dayEvents = allEvents.filter(e => e.date === targetDateStr);
        let weightedCount = 0;
        
        dayEvents.forEach(event => {
          let weight = 1;
          
          // Weight by type
          if (event.type === 'Exam') weight = 3;
          else if (event.type === 'Assignment') weight = 2;
          else if (event.type === 'Meeting/Presentation') weight = 1.5;
          else weight = 1;
          
          // Multiply by priority
          if (event.priority === 'high') weight *= 1.5;
          else if (event.priority === 'low') weight *= 0.7;
          
          weightedCount += weight;
        });
        
        deadlines[i] = Math.round(weightedCount);
      }
      
      form.setValue('last14', last14);
      form.setValue('deadlines_next7', deadlines);
      
      // Auto-submit after loading data
      setTimeout(() => {
        form.handleSubmit(onSubmit)();
      }, 100);
    } catch (e) {
      setError("Failed to load your data. Please try manual entry.");
    } finally {
      setLoadingData(false);
    }
  };

  const chartData = prediction ? prediction.pred.map((p, i) => ({
    day: `Day ${i + 1}`,
    dayLabel: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    prediction: Math.round(p),
    confidence: Math.round(prediction.conf[i]),
    confLower: Math.max(0, Math.round(p - prediction.conf[i])),
    confUpper: Math.min(100, Math.round(p + prediction.conf[i])),
  })) : [];

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'Severe', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-500/10' };
    if (score >= 50) return { label: 'High', color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-500/10' };
    if (score >= 30) return { label: 'Moderate', color: 'text-yellow-500 dark:text-yellow-400', bg: 'bg-yellow-500/10' };
    return { label: 'Low', color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10' };
  };

  const getMaxRiskDay = () => {
    if (!chartData.length) return null;
    const maxDay = chartData.reduce((max, day) => day.prediction > max.prediction ? day : max, chartData[0]);
    return maxDay;
  };

  const maxRiskDay = getMaxRiskDay();
  
  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gradient mb-2">7-Day Burnout Forecast</h1>
        <p className="text-muted-foreground">Predict your burnout risk using historical data and upcoming events</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Input Sidebar */}
        <div className="space-y-4">
          <Card className="card-gradient dark:glow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Your Inputs
              </CardTitle>
              <CardDescription>Provide data for the last 14 days and the next 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="auto">Use My Data</TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="mt-4 space-y-4">
                  <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {/* Last 14 Days */}
                      <div>
                        <Label className="text-sm font-medium">Last 14 Days Scores (0-100)</Label>
                        <div className="grid grid-cols-7 gap-1 mt-2">
                          {Array.from({ length: 14 }).map((_, i) => (
                            <Controller
                              key={i}
                              name={`last14.${i}`}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min={0}
                                  max={100}
                                  className="h-10 text-xs text-center p-1"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Next 7 Days Deadlines */}
                      <div>
                        <Label className="text-sm font-medium">Deadlines Next 7 Days (0-10)</Label>
                        <div className="grid grid-cols-7 gap-1 mt-2">
                          {Array.from({ length: 7 }).map((_, i) => (
                            <Controller
                              key={i}
                              name={`deadlines_next7.${i}`}
                              control={form.control}
                              render={({ field }) => (
                                <Input
                                  {...field}
                                  type="number"
                                  min={0}
                                  max={10}
                                  className="h-10 text-xs text-center p-1"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-gradient-primary" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Forecast Risk
                      </Button>
                    </form>
                  </FormProvider>
                </TabsContent>

                <TabsContent value="auto" className="mt-4">
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <p className="text-sm font-medium">Smart Data Integration</p>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Pulls your recent assessment scores</li>
                            <li>• Analyzes calendar events and priorities</li>
                            <li>• Weights exams, assignments, and deadlines</li>
                            <li>• Auto-generates forecast prediction</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={useMyData} 
                      className="w-full bg-gradient-primary" 
                      disabled={loadingData}
                    >
                      {loadingData && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Calendar className="mr-2 h-4 w-4" />
                      Load My Data
                    </Button>

                    {loadingData && (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  <p className="text-xs">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Note */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> "Use My Data" prioritizes Full Assessment scores, followed by DASS-21, then Quick Risk assessments. Calendar events are weighted by type and priority.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results Area */}
        <div className="space-y-4">
          <Card className="card-gradient">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Forecast Results
                  </CardTitle>
                  <CardDescription className="mt-1">Your predicted burnout risk for the next 7 days.</CardDescription>
                </div>
                {maxRiskDay && (
                  <Badge className={cn("px-3 py-1", getRiskLevel(maxRiskDay.prediction).bg, getRiskLevel(maxRiskDay.prediction).color)}>
                    Peak: {getRiskLevel(maxRiskDay.prediction).label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                </div>
              ) : !prediction ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Enter your data and click "Forecast Risk" to see predictions</p>
                  <Button onClick={() => setActiveTab('auto')} variant="outline" size="sm" className="mt-4">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Try Auto Mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Chart */}
                  <div className="h-64">
                    <ChartContainer config={chartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="gradientPrediction" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="day" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            domain={[0, 100]}
                          />
                          <Area
                            type="monotone"
                            dataKey="prediction"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#gradientPrediction)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>

                  {/* Timeline Cards */}
                  <div className="grid grid-cols-7 gap-2">
                    {chartData.map((day, i) => {
                      const risk = getRiskLevel(day.prediction);
                      return (
                        <Card key={i} className={cn("text-center", risk.bg)}>
                          <CardContent className="p-3 space-y-2">
                            <div className="text-xs text-muted-foreground font-medium">
                              {day.dayLabel.split(',')[0]}
                            </div>
                            <div className={cn("text-2xl font-bold", risk.color)}>
                              {day.prediction}
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {risk.label}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Insights */}
                  {maxRiskDay && (
                    <Card className="border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start gap-3">
                          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">Forecast Insight</p>
                            <p className="text-sm text-muted-foreground">
                              Your highest predicted risk is <strong>{maxRiskDay.prediction}</strong> on <strong>{maxRiskDay.dayLabel}</strong> ({getRiskLevel(maxRiskDay.prediction).label} level). 
                              {maxRiskDay.prediction >= 70 && " Consider rescheduling non-critical tasks and prioritizing rest."}
                              {maxRiskDay.prediction >= 50 && maxRiskDay.prediction < 70 && " Plan breaks and avoid overcommitting."}
                              {maxRiskDay.prediction < 50 && " Maintain your current pace and routine!"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, TrendingUp, Calendar, Sparkles, Activity, Edit3, Info } from 'lucide-react';
import { api, apiSafe } from '@/lib/api';
import type { ForecastResponse, ForecastRequest } from '@/lib/types';
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Flexible schema that allows any number of days (1-14)
const forecastSchema = z.object({
  last14: z.array(z.number().int().min(0).max(100)).min(1).max(14),
  deadlines_next7: z.array(z.number().int().min(0).max(10)).length(7, "Must have 7 values"),
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

  const [daysCount, setDaysCount] = useState(14); // Track how many historical days we have

  const form = useForm<ForecastFormValues>({
    resolver: zodResolver(forecastSchema),
    defaultValues: {
        // Realistic journey: High stress (73→78→72) → Recovery (57→52→45) → Balanced (41→32→28→29→22→31→19)
        last14: [73, 78, 72, 57, 52, 45, 41, 32, 28, 29, 22, 31, 19, 19],
        deadlines_next7: [0, 0, 0, 0, 0, 0, 0],
    },
  });

  const onSubmit = async (data: ForecastFormValues) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      // Pad last14 to exactly 14 if less than 14
      const paddedLast14 = [...data.last14];
      while (paddedLast14.length < 14) {
        paddedLast14.unshift(paddedLast14[0] || 0); // Pad front with first value or 0
      }
      
      const result = await api.forecast({
        last14: paddedLast14,
        deadlines_next7: data.deadlines_next7,
      });
      setPrediction(result);
    } catch (e) {
      setError("An error occurred while fetching the forecast.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Use My Data with flexible history length
  const useMyData = async () => {
    setLoadingData(true);
    setActiveTab('auto');
    try {
      const hist = await apiSafe.history(28);
      const items = hist.data?.items || [];
      
      // Enhanced score prioritization: Full Assessment > Quick Risk
      const scores = items
        .map(it => {
          // Check for new burnout assessment
          if ((it as any).type === 'burnout_assessment') {
            return Math.round(Number((it as any).result?.burnout_score ?? 0));
          }
          // Then fused scores
          const fusedScore = it.fused?.final_score_0_100;
          if (fusedScore != null) return Math.round(Number(fusedScore));
          // Finally quick risk
          const quickScore = it.result?.burnout_score;
          if (quickScore != null) return Math.round(Number(quickScore));
          return null;
        })
        .filter((n): n is number => n !== null && !Number.isNaN(n));
      
      // Use available scores (1 to 14 days)
      const availableScores = scores.slice(Math.max(0, scores.length - 14)).reverse();
      const actualDays = availableScores.length || 1;
      setDaysCount(actualDays);
      
      // If we have scores, use them; otherwise use a neutral baseline
      const last14 = availableScores.length > 0 ? availableScores : [35];
      
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
          // Base weight by event type (research-backed, unified across app)
          let weight = 1;
          if (event.type === 'Exam') weight = 8;
          else if (event.type === 'Assignment') weight = 5;
          else if (event.type === 'Meeting/Presentation') weight = 3;
          else if (event.type === 'Study Session') weight = -2; // Reduces stress
          else if (event.type === 'Exercise/Break') weight = -3; // Reduces stress
          else if (event.type === 'Sleep') weight = -1; // Slightly reduces stress
          else if (event.type === 'Work Shift') weight = 4;
          else weight = 1;
          
          // Multiply by priority
          const priorityMultiplier = 
            event.priority === 'high' ? 1.5 :
            event.priority === 'low' ? 0.7 : 1.0;
          
          // Multiply by complexity/intensity
          const complexityMultiplier = 
            event.intensity === 'complex' ? 1.4 :
            event.intensity === 'easy' ? 0.8 : 1.0;
          
          // Calculate final stress contribution
          const eventStress = weight * priorityMultiplier * complexityMultiplier;
          weightedCount += eventStress;
        });
        
        // Clamp to 0-10 range (deadlines can't be negative in this context)
        deadlines[i] = Math.max(0, Math.min(10, Math.round(weightedCount)));
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

  const chartData = prediction ? prediction.pred.map((p, i) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + i + 1);
    
    return {
    day: `Day ${i + 1}`,
      dayShort: futureDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayLabel: futureDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      dayNum: futureDate.getDate(),
      month: futureDate.toLocaleDateString('en-US', { month: 'short' }),
      prediction: Math.round(p),
      confidence: Math.round(prediction.conf[i]),
      confLower: Math.max(0, Math.round(p - prediction.conf[i])),
      confUpper: Math.min(100, Math.round(p + prediction.conf[i])),
    };
  }) : [];

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

                <TabsContent value="manual" className="mt-4 space-y-6">
                  <FormProvider {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Last 14 Days - Sleek scroll area */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Past Burnout Scores (0-100)</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Edit3 className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">Enter your burnout scores from the last 1-14 days. Scroll right for more.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="relative">
                          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                        {Array.from({ length: 14 }).map((_, i) => (
                              <Controller
                                key={i}
                                name={`last14.${i}`}
                                control={form.control}
                                render={({ field }) => (
                                  <div className="flex flex-col items-center gap-2 min-w-[64px] shrink-0">
                                    <span className="text-xs text-muted-foreground font-medium">Day {i + 1}</span>
                                    <Input
                                      {...field}
                                      type="number"
                                      min={0}
                                      max={100}
                                      step={1}
                                      className="h-14 text-center text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      onChange={(e) => field.onChange(Math.round(Number(e.target.value)))}
                                    />
                                  </div>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Next 7 Days Deadlines - Modern layout */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Upcoming Deadlines (0-10)</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Calendar className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">Number of exams, assignments, or major tasks due each day</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {Array.from({ length: 7 }).map((_, i) => {
                            const dayDate = new Date();
                            dayDate.setDate(dayDate.getDate() + i);
                            const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = dayDate.getDate();
                            const month = dayDate.toLocaleDateString('en-US', { month: 'short' });
                            
                            return (
                              <Controller
                                key={i}
                                name={`deadlines_next7.${i}`}
                                control={form.control}
                                render={({ field }) => (
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="text-center">
                                      <div className="text-xs font-semibold text-foreground">{dayName}</div>
                                      <div className="text-[10px] text-muted-foreground">{month} {dayNum}</div>
                                    </div>
                                    <Input
                                      {...field}
                                      type="number"
                                      min={0}
                                      max={10}
                                      step={1}
                                      className="h-14 text-center text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      onChange={(e) => field.onChange(Math.round(Number(e.target.value)))}
                                    />
                                  </div>
                                )}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-gradient-primary shadow-md" size="lg" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <TrendingUp className="mr-2 h-5 w-5" />
                            Generate Forecast
                          </>
                        )}
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

          {/* Info Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-medium">How It Works</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>"Use My Data"</strong> pulls your recent Full Assessment scores and Quick Risk data. 
                    Calendar events (exams, assignments, meetings) are automatically weighted by type and priority to forecast upcoming stress levels.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Works with <strong>1-14 days</strong> of history. More data = better predictions!
                  </p>
                </div>
              </div>
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
                <div className="space-y-8">
                  {/* Chart with proper spacing */}
                  <div className="h-80 pt-2">
                    <ChartContainer config={chartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                        <defs>
                            <linearGradient id="gradientPrediction" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis 
                            dataKey="day" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            tickLine={false}
                            height={40}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            domain={[0, 100]}
                            tickLine={false}
                            ticks={[0, 25, 50, 75, 100]}
                            width={35}
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const risk = getRiskLevel(data.prediction);
                                return (
                                  <div className="bg-background/95 backdrop-blur border-2 border-border rounded-lg shadow-lg p-3">
                                    <p className="text-sm font-semibold mb-1">{data.dayLabel}</p>
                                    <p className={cn("text-2xl font-bold", risk.color)}>
                                      {Math.round(data.prediction)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {risk.label} Risk
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="prediction"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            fill="url(#gradientPrediction)"
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                          />
                    </AreaChart>
                      </ResponsiveContainer>
                </ChartContainer>
                  </div>

                  {/* Timeline Cards - Responsive layout with dates */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {chartData.map((day, i) => {
                      const risk = getRiskLevel(day.prediction);
                      return (
                        <Card key={i} className={cn("text-center border-2", risk.bg)}>
                          <CardContent className="p-3 sm:p-4 space-y-2">
                            <div className="space-y-0.5">
                              <div className="text-xs sm:text-sm font-bold text-foreground">
                                {day.dayShort}
                              </div>
                              <div className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">
                                {day.month} {day.dayNum}
                              </div>
                            </div>
                            <div className={cn("text-2xl sm:text-3xl font-bold tabular-nums", risk.color)}>
                              {Math.round(day.prediction)}
                            </div>
                            <div className="pt-1">
                              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 font-semibold">
                                {risk.label}
                              </Badge>
                            </div>
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
                          <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">Forecast Insight</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              Your highest predicted risk is <strong>{Math.round(maxRiskDay.prediction)}</strong> on <strong>{maxRiskDay.dayLabel}</strong> ({getRiskLevel(maxRiskDay.prediction).label} level). 
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

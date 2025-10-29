
"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, HeartPulse, BrainCircuit, Activity, Info } from 'lucide-react';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import Gauge from '@/components/Gauge';
import { cn } from '@/lib/utils';
import { apiSafe } from '@/lib/api';
import { toLocalDayKey, scoreToLevel, levelToColor, clamp, getBarFillColor } from '@/lib/utils';
import ErrorState from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';

const featureCards = [
    { title: "Quick Risk", description: "Get a fast burnout risk score.", href:"/quick-risk", icon: HeartPulse },
    { title: "Full Assessment", description: "Complete 15-question burnout assessment.", href:"/assessment", icon: BrainCircuit },
    { title: "7-Day Forecast", description: "Predict your risk for the next week.", href:"/forecast", icon: Activity },
    { title: "Check Status", description: "View system and model health.", href:"/status", icon: Info },
];

const chartConfig = {
  score: { label: 'Risk Score', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

export default function DashboardPage() {
  const { user } = useAuth();
  const [latestScore, setLatestScore] = useState<number | null>(null);
  const [latestLevelText, setLatestLevelText] = useState<string>('');
  const [colorClass, setColorClass] = useState<string>('text-green-500');
  const [glowColor, setGlowColor] = useState<string>('142 76% 50%'); // Default green
  const [chartData, setChartData] = useState<{ day: string; score: number; drivers?: string[]; hasData: boolean; type?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarStress, setCalendarStress] = useState<number>(0);
  const [latestQuickCheck, setLatestQuickCheck] = useState<{score: number, date: string, risk: string} | null>(null);

  const calculateCalendarStress = async () => {
    try {
      // Get calendar events for the next 7 days
      const today = new Date();
      const next7Days = new Date(today);
      next7Days.setDate(today.getDate() + 7);
      
      const result = await apiSafe.calendarList();
      if (result.error || !result.data) return 0;
      
      const events = result.data;
      let stressPoints = 0;
      
      // Count upcoming high-stress events
      for (const event of events) {
        const eventDate = new Date(event.date);
        if (eventDate >= today && eventDate <= next7Days) {
          // Weight different event types
          if (event.type === 'Exam') stressPoints += 10;
          else if (event.type === 'Assignment') stressPoints += 7;
          else if (event.type === 'Meeting/Presentation') stressPoints += 5;
          else stressPoints += 2;
        }
      }
      
      // Cap calendar stress contribution at 20 points
      return Math.min(stressPoints, 20);
    } catch (err) {
      console.error('Error calculating calendar stress:', err);
      return 0;
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load calendar stress
      const calStress = await calculateCalendarStress();
      setCalendarStress(calStress);
      
      const history = await apiSafe.history(30);
      if (history.error) {
        setError(history.error);
        setIsLoading(false);
        return;
      }
      const items = history.data?.items || [];
      
      // Find latest quick check (not for main score, just for supplementary display)
      const quickChecks = items.filter(it => {
        const isQuickCheck = !it.type || it.type !== 'burnout_assessment';
        return isQuickCheck && it.result && typeof it.result.burnout_score === 'number';
      });
      if (quickChecks.length > 0) {
        const latest = quickChecks[quickChecks.length - 1];
        const score = latest.result?.burnout_score || 0;
        const risk = (latest.result as any)?.risk_label || 'Unknown';
        const date = new Date(latest.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        setLatestQuickCheck({ score, date, risk });
      }
      
      // Find most recent FULL assessment ONLY (never use quick checks for main score)
      let latestEntry = null;
      let assessmentType = 'None';
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        // Check for new Full Assessment type first (ML-powered, 86% accuracy)
        if ((it as any).type === 'burnout_assessment' && (it as any).result?.burnout_score != null) {
          latestEntry = it;
          assessmentType = 'Full Assessment';
          break;
        }
        // Legacy support for old DASS-21 assessments (if any exist)
        if (it.fused?.final_score_0_100 != null) {
          latestEntry = it;
          assessmentType = 'DASS-21';
          break;
        }
        // NEVER use quick risk scores for main burnout score
        // Quick checks are for daily monitoring only (shown in sidebar)
      }
      
      if (latestEntry) {
        // Get base score
        let baseScore = 0;
        if ((latestEntry as any).type === 'burnout_assessment') {
          baseScore = (latestEntry as any).result.burnout_score;
        } else {
          baseScore = latestEntry.fused?.final_score_0_100 ?? latestEntry.result?.burnout_score ?? 0;
        }
        
        // Add calendar stress modifier
        const fusedScore = clamp(Number(baseScore) + calStress);
        
        setLatestScore(Math.round(fusedScore));
        const lvl = scoreToLevel(fusedScore);
        const colors = levelToColor(lvl);
        setLatestLevelText(lvl);
        setColorClass(colors.text);
        setGlowColor(colors.glow);
      } else {
        // No full assessment taken yet - don't show a score
        // User must take a full assessment to see their official burnout score
        setLatestScore(null);
      }

      // Build last 7 days chart (ONLY Full Assessments, no quick checks)
      const byDay = new Map<string, { score: number; drivers?: string[]; type: string }>();
      for (const it of items) {
        const day = toLocalDayKey(it.timestamp);
        
        // Only include Full Burnout Assessments (ML-powered)
        if ((it as any).type === 'burnout_assessment' && (it as any).result?.burnout_score != null) {
          const val = clamp(Number((it as any).result.burnout_score));
          const drivers = (it as any).result.top_drivers || [];
          byDay.set(day, { score: val, drivers, type: 'Full Assessment' });
        }
        // Legacy support for old DASS-21 assessments (if any exist)
        else if (it.fused?.final_score_0_100 != null && !byDay.has(day)) {
          const val = clamp(Number(it.fused.final_score_0_100));
          const drivers = it.fused?.survey?.top_drivers || [];
          byDay.set(day, { score: val, drivers, type: 'DASS-21' });
        }
        // Quick Risk scores are NOT included in this chart
        // They have their own section in the Progress page
      }
      const today = new Date();
      const days: { day: string; score: number; drivers?: string[]; hasData: boolean; type?: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = toLocalDayKey(d);
        const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (byDay.has(key)) {
          const v = byDay.get(key)!;
          days.push({ day: label, score: Math.round(v.score), drivers: v.drivers as string[], hasData: true, type: v.type });
        } else {
          days.push({ day: label, score: 0, hasData: false });
        }
      }
      setChartData(days);
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  return (
    <div className="container mx-auto p-0">
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gradient">Welcome, {user?.id || 'User'}!</h1>
        <p className="text-muted-foreground">Here's your burnout risk overview. Stay mindful and balanced.</p>
      </div>

      {error && (
        <ErrorState 
          title="Failed to Load Dashboard" 
          message={error}
          onRetry={loadData}
          className="my-8"
        />
      )}

      {!error && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
            {/* Hero Gauge Section - No card wrapper for cleaner look */}
            <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-64 w-64 rounded-full mx-auto" />
                  <Skeleton className="h-6 w-40 mx-auto" />
                  <Skeleton className="h-12 w-full max-w-sm mx-auto" />
                </div>
              ) : latestScore === null ? (
                  <>
                  <p className="text-lg text-muted-foreground mb-4">No full assessment yet. Take the comprehensive burnout assessment for your official score.</p>
                  <Button asChild size="lg" className="bg-gradient-primary text-lg px-8 py-6">
                    <Link href="/assessment">Take Full Burnout Assessment <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                </>
              ) : (
                <>
                  <Gauge value={latestScore} colorClass={colorClass} glow={true} glowColor={glowColor} size={280} />
                  <div className='space-y-2'>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider">Current Level</p>
                    <p className={cn('text-3xl font-bold', colorClass)}>{latestLevelText}</p>
                  </div>
                  
                  {/* Score Breakdown */}
                  {calendarStress > 0 && (
                    <div className="text-sm text-muted-foreground max-w-xs bg-muted/30 rounded-lg p-4 backdrop-blur">
                      <p className="font-semibold mb-2 text-foreground">Score Breakdown:</p>
                      <div className="flex justify-between">
                        <span>Base Assessment:</span>
                        <span className="font-medium">{Math.round(latestScore - calendarStress)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Calendar Stress:</span>
                        <span className="text-orange-500 font-medium">+{calendarStress}</span>
                      </div>
                      <div className="flex justify-between border-t border-border mt-2 pt-2 font-bold text-foreground">
                        <span>Total Score:</span>
                        <span>{latestScore}</span>
                      </div>
                    </div>
                  )}
                  
                  <Button asChild size="lg" className="bg-gradient-primary text-lg px-8 py-6 mt-2">
                    <Link href="/assessment">Take New Assessment <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                </>
              )}
            </div>
            
             <Card>
                <CardHeader>
                  <CardTitle>Recent Full Assessments</CardTitle>
                  <CardDescription>
                    Your ML-powered burnout scores from the last 7 days (86% accuracy). 
                    {chartData.filter(d => d.hasData).length === 0 && !isLoading && (
                      <span className="text-orange-500 font-medium"> No data yet - take a full assessment to see your history!</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : chartData.filter(d => d.hasData).length === 0 ? (
                    <div className="h-[250px] w-full flex flex-col items-center justify-center text-center gap-4">
                      <p className="text-muted-foreground">No full assessment data for the last 7 days.</p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/assessment">Take Full Assessment</Link>
                      </Button>
                    </div>
                  ) : (
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.5)" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        stroke='hsl(var(--muted-foreground))'
                        fontSize={12}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        stroke='hsl(var(--muted-foreground))'
                        fontSize={12}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        width={40}
                        label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' } }}
                      />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0]?.payload as any;
                          const riskLevel = p.score >= 70 ? 'Severe' : p.score >= 50 ? 'High' : p.score >= 30 ? 'Moderate' : 'Low';
                          const riskColor = p.score >= 70 ? 'text-red-500' : p.score >= 50 ? 'text-orange-500' : p.score >= 30 ? 'text-yellow-500' : 'text-green-500';
                          return (
                            <div className="rounded-lg border-2 bg-background/95 backdrop-blur p-3 shadow-lg">
                              <p className="text-sm font-semibold mb-1">{p.day}</p>
                              <p className={`text-2xl font-bold ${riskColor}`}>{p.score}<span className="text-sm text-muted-foreground">/100</span></p>
                              <p className="text-xs text-muted-foreground mt-1">{riskLevel} Risk</p>
                              {p.type && <p className="text-[10px] text-muted-foreground mt-1">Type: {p.type}</p>}
                              {Array.isArray(p.drivers) && p.drivers.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {p.drivers.slice(0, 3).map((d: any, i: number) => (
                                    <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{typeof d === 'string' ? d : d?.feature ?? JSON.stringify(d)}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="score" radius={4}>
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.hasData ? getBarFillColor(entry.score) : 'hsl(var(--muted))'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  )}
                </CardContent>
              </Card>
        </div>
        
        <div className="space-y-4">
            {/* Latest Quick Check - Supplementary Info */}
            {latestQuickCheck && (
              <Card className="border-2 border-muted bg-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Latest Quick Check</CardTitle>
                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      "text-4xl font-bold",
                      latestQuickCheck.score >= 70 ? 'text-red-400' :
                      latestQuickCheck.score >= 50 ? 'text-orange-400' :
                      latestQuickCheck.score >= 30 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {Math.round(latestQuickCheck.score)}
                    </span>
                    <span className="text-sm text-muted-foreground">{latestQuickCheck.risk}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Checked on {latestQuickCheck.date}</p>
                    <p className="mt-1 italic">This is a quick estimate, not your official burnout score.</p>
                  </div>
                  <Link href="/quick-risk">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Take Another Quick Check
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
            
            {featureCards.map(card => (
                <Card key={card.title} className="flex flex-col hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base font-medium">{card.title}</CardTitle>
                        <card.icon className="h-5 w-5 text-accent" />
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                        <Button asChild size="sm" variant="link" className="text-accent p-0 h-auto">
                            <Link href={card.href}>Go to page <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>

      </div>
      )}
    </div>
  );
}

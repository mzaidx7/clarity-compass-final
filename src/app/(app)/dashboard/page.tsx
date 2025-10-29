
"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, HeartPulse, BrainCircuit, Activity, Info } from 'lucide-react';
import { ChartContainer, ChartConfig } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, Cell } from 'recharts';
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
  const [chartData, setChartData] = useState<{ day: string; score: number; drivers?: string[]; hasData: boolean; type?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarStress, setCalendarStress] = useState<number>(0);

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
      
      // Find most recent assessment (prioritize: Assessment > Fused/DASS-21 > Quick Risk)
      let latestEntry = null;
      let assessmentType = 'None';
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        // Check for new Assessment type first
        if ((it as any).type === 'burnout_assessment' && (it as any).result?.burnout_score != null) {
          latestEntry = it;
          assessmentType = 'Full Assessment';
          break;
        }
        // Then check for fused/DASS-21
        if (it.fused?.final_score_0_100 != null) {
          latestEntry = it;
          assessmentType = 'DASS-21';
          break;
        }
        // Finally quick risk
        if (it.result?.burnout_score != null) {
          latestEntry = it;
          assessmentType = 'Quick Risk';
          break;
        }
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
        setLatestLevelText(lvl);
        setColorClass(levelToColor(lvl).text);
      } else {
        // No assessment data, just show calendar stress if any
        if (calStress > 0) {
          setLatestScore(Math.round(calStress));
          const lvl = scoreToLevel(calStress);
          setLatestLevelText(lvl);
          setColorClass(levelToColor(lvl).text);
        } else {
          setLatestScore(null);
        }
      }

      // Build last 7 days chart (prioritize fused over quick risk)
      const byDay = new Map<string, { score: number; drivers?: string[]; type: string }>();
      for (const it of items) {
        const day = toLocalDayKey(it.timestamp);
        const isFused = it.fused?.final_score_0_100 != null;
        const val = isFused 
          ? clamp(Number(it.fused.final_score_0_100))
          : clamp(Number(it.result?.burnout_score ?? 0));
        const drivers = it.fused?.survey?.top_drivers || it.result?.top_drivers || [];
        const type = isFused ? 'DASS-21' : 'Quick Risk';
        // Keep the most recent entry for each day
        if (!byDay.has(day) || isFused) {
          byDay.set(day, { score: val, drivers, type });
        }
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
            <Card className="card-gradient dark:glow flex flex-col items-center justify-center gap-6 p-8 text-center">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-48 rounded-full mx-auto" />
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <Skeleton className="h-10 w-full max-w-xs mx-auto" />
                </div>
              ) : latestScore === null ? (
                <>
                  <p className="text-muted-foreground">No recent assessment yet. Take your first assessment.</p>
                  <Button asChild className="w-full max-w-xs bg-gradient-primary">
                    <Link href="/quick-risk">Take New Assessment <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </>
              ) : (
                <>
                  <Gauge value={latestScore} colorClass={colorClass} glow size={220} />
                  <div className='space-y-1'>
                    <p className="text-sm text-muted-foreground">Current Level</p>
                    <p className={cn('text-xl font-semibold', colorClass)}>{latestLevelText}</p>
                  </div>
                  
                  {/* Score Breakdown */}
                  {calendarStress > 0 && (
                    <div className="text-sm text-muted-foreground max-w-xs">
                      <p className="font-medium mb-1">Score Breakdown:</p>
                      <div className="flex justify-between">
                        <span>Base Assessment:</span>
                        <span>{Math.round(latestScore - calendarStress)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Calendar Stress:</span>
                        <span className="text-orange-500">+{calendarStress}</span>
                      </div>
                      <div className="flex justify-between border-t mt-1 pt-1 font-semibold">
                        <span>Total Score:</span>
                        <span>{latestScore}</span>
                      </div>
                    </div>
                  )}
                  
                  <Button asChild className="w-full max-w-xs bg-gradient-primary">
                    <Link href="/assessment">Take New Assessment <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </>
              )}
            </Card>
            
             <Card>
                <CardHeader>
                  <CardTitle>Recent Assessments</CardTitle>
                  <CardDescription>Your risk scores from the last 7 days (DASS-21 + Quick Risk).</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -10 }}>
                      <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.5)" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        stroke='hsl(var(--muted-foreground))'
                      />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0]?.payload as any;
                          return (
                            <div className="rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
                              <p className="text-xs text-muted-foreground">{p.day}</p>
                              <p className="text-sm font-medium">Score: {p.score}</p>
                              {p.type && <p className="text-xs text-muted-foreground">Type: {p.type}</p>}
                              {Array.isArray(p.drivers) && p.drivers.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
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

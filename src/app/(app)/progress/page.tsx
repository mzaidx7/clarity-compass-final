"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { levelToColor, scoreToLevel, getScoreColor, cn } from '@/lib/utils';
import ErrorState from '@/components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Zap, Heart, TrendingUp, Calendar as CalendarIcon, Lock } from 'lucide-react';

type HistoryEntry = {
  timestamp: string;
  input: { sleep_hours: number; study_hours: number; assignments_due: number; exams_within_7d: number };
  result: { burnout_score: number; risk_label: string; top_drivers: string[] } | null;
};

export default function ProgressPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { apiSafe } = await import('@/lib/api');
      const [historyRes, calendarRes] = await Promise.all([
        apiSafe.history(50), // Get more history for better achievement tracking
        apiSafe.calendarList()
      ]);
      
      if (historyRes.error) {
        setError(historyRes.error);
      } else {
        setHistory(historyRes.data?.items as any || []);
      }

      if (!calendarRes.error && calendarRes.data) {
        setCalendarEvents(calendarRes.data);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chartData = useMemo(() => {
    // ONLY Full Burnout Assessments (ML-powered, 86% accuracy) - NO quick checks
    return (history || [])
      .filter(h => (h as any).type === 'burnout_assessment' && h.result?.burnout_score != null)
      .slice(-20) // Last 20 full assessments
      .map(h => ({
      time: new Date(h.timestamp).toLocaleDateString(),
      score: h.result?.burnout_score ?? null,
        type: 'Full Assessment'
      }))
      .filter(d => d.score !== null);
  }, [history]);

  const quickCheckData = useMemo(() => {
    // Only quick checks (excluding full assessments)
    return (history || [])
      .filter(h => !(h as any).type || (h as any).type !== 'burnout_assessment')
      .filter(h => h.result?.burnout_score != null)
      .slice(-14) // Last 14 quick checks
      .map(h => ({
        time: new Date(h.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: h.result?.burnout_score ?? null,
      }));
  }, [history]);

  const chartConfig = {
    score: { label: 'Score', color: 'hsl(var(--primary))' },
  } satisfies ChartConfig;

  type Achievement = {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
    progress?: number;
    maxProgress?: number;
    category: 'consistency' | 'wellness' | 'improvement' | 'milestone' | 'organization';
    icon: string;
    color: string;
  };

  const achievements = useMemo(() => {
    const items: Achievement[] = [];
    
    // ===== CONSISTENCY & ENGAGEMENT =====
    
    // Streak Achievements
    const byDay = new Set((history || []).map(h => new Date(h.timestamp).toDateString()));
    let currentStreak = 0; 
    const today = new Date();
    for (let i = 0; i < 14; i++) { 
      const d = new Date(today); 
      d.setDate(today.getDate() - i); 
      if (byDay.has(d.toDateString())) currentStreak++; 
      else break;
    }
    
    items.push({
      id: 'streak3',
      title: '3-Day Streak',
      description: 'Track your burnout for 3 consecutive days',
      unlocked: currentStreak >= 3,
      progress: Math.min(currentStreak, 3),
      maxProgress: 3,
      category: 'consistency',
      icon: '🔥',
      color: 'from-orange-500 to-red-500'
    });

    items.push({
      id: 'streak7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day assessment streak',
      unlocked: currentStreak >= 7,
      progress: Math.min(currentStreak, 7),
      maxProgress: 7,
      category: 'consistency',
      icon: '⚡',
      color: 'from-yellow-500 to-orange-500'
    });

    // Total assessments
    const fullAssessments = (history || []).filter(h => (h as any).type === 'burnout_assessment');
    items.push({
      id: 'assessments10',
      title: 'Self-Aware Scholar',
      description: 'Complete 10 full burnout assessments',
      unlocked: fullAssessments.length >= 10,
      progress: Math.min(fullAssessments.length, 10),
      maxProgress: 10,
      category: 'milestone',
      icon: '🎓',
      color: 'from-blue-500 to-purple-500'
    });

    // ===== WELLNESS ACHIEVEMENTS =====

    // Sleep Consistency (last 7 entries with sleep data)
    const last7WithSleep = (history || []).slice(-7).filter(h => h.input?.sleep_hours != null);
    const goodSleep = last7WithSleep.filter(h => (h.input?.sleep_hours ?? 0) >= 7).length;
    items.push({
      id: 'sleep_master',
      title: 'Sleep Master',
      description: 'Get 7+ hours of sleep for 5 of last 7 days',
      unlocked: goodSleep >= 5 && last7WithSleep.length >= 7,
      progress: goodSleep,
      maxProgress: 7,
      category: 'wellness',
      icon: '😴',
      color: 'from-indigo-500 to-blue-500'
    });

    // Exercise/Physical Activity
    const last7WithActivity = (history || []).slice(-7).filter(h => h.input?.physical_activity != null);
    const activeCount = last7WithActivity.filter(h => (h.input?.physical_activity ?? 0) >= 3).length;
    items.push({
      id: 'active_lifestyle',
      title: 'Active Lifestyle',
      description: '3+ hours of exercise per week for a week',
      unlocked: activeCount >= 5 && last7WithActivity.length >= 7,
      progress: activeCount,
      maxProgress: 7,
      category: 'wellness',
      icon: '💪',
      color: 'from-green-500 to-teal-500'
    });

    // Social Support
    const last7WithSupport = (history || []).slice(-7).filter(h => h.input?.social_support != null);
    const highSupport = last7WithSupport.filter(h => (h.input?.social_support ?? 0) >= 4).length;
    items.push({
      id: 'social_butterfly',
      title: 'Social Butterfly',
      description: 'Maintain strong social support (4-5/5) for a week',
      unlocked: highSupport >= 5 && last7WithSupport.length >= 7,
      progress: highSupport,
      maxProgress: 7,
      category: 'wellness',
      icon: '🦋',
      color: 'from-pink-500 to-rose-500'
    });

    // ===== IMPROVEMENT & RISK MANAGEMENT =====

    // Low Burnout Week
    const last7Scores = (history || [])
      .filter(h => (h as any).type === 'burnout_assessment' && h.result?.burnout_score != null)
      .slice(-7);
    const avgScore = last7Scores.length 
      ? last7Scores.reduce((s, h) => s + (h.result?.burnout_score ?? 0), 0) / last7Scores.length 
      : 100;
    items.push({
      id: 'balanced_week',
      title: 'Balanced Week',
      description: 'Maintain average burnout score ≤35 for a week',
      unlocked: avgScore <= 35 && last7Scores.length >= 5,
      progress: avgScore <= 35 ? 100 : Math.max(0, 100 - avgScore),
      maxProgress: 100,
      category: 'improvement',
      icon: '⚖️',
      color: 'from-emerald-500 to-green-500'
    });

    // Score Improvement
    if (fullAssessments.length >= 2) {
      const first = fullAssessments[0].result?.burnout_score ?? 0;
      const latest = fullAssessments[fullAssessments.length - 1].result?.burnout_score ?? 0;
      const improvement = first - latest;
      items.push({
        id: 'improvement',
        title: 'Progress Champion',
        description: 'Reduce burnout score by 15+ points',
        unlocked: improvement >= 15,
        progress: Math.max(0, improvement),
        maxProgress: 15,
        category: 'improvement',
        icon: '📈',
        color: 'from-cyan-500 to-blue-500'
      });
    }

    // ===== ORGANIZATION =====

    // Calendar Usage
    const upcomingEvents = calendarEvents.filter(e => {
      const eventDate = new Date(e.date);
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      return eventDate >= today && eventDate <= oneWeekFromNow;
    });

    items.push({
      id: 'planner',
      title: 'Master Planner',
      description: 'Schedule 5+ events in your calendar',
      unlocked: upcomingEvents.length >= 5,
      progress: Math.min(upcomingEvents.length, 5),
      maxProgress: 5,
      category: 'organization',
      icon: '📅',
      color: 'from-violet-500 to-purple-500'
    });

    // Positive Events (stress reducers)
    const positiveEvents = calendarEvents.filter(e => 
      ['Study Session', 'Exercise/Break', 'Sleep'].includes(e.type)
    );
    items.push({
      id: 'self_care',
      title: 'Self-Care Pro',
      description: 'Schedule 3+ wellness activities this week',
      unlocked: positiveEvents.length >= 3,
      progress: Math.min(positiveEvents.length, 3),
      maxProgress: 3,
      category: 'organization',
      icon: '🌟',
      color: 'from-amber-500 to-yellow-500'
    });

    return items;
  }, [history, calendarEvents]);

  return (
    <div className="container mx-auto p-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
        <p className="text-muted-foreground">Recent assessment scores and achievements.</p>
      </div>
      
      {error && (
        <ErrorState 
          title="Failed to Load Progress" 
          message={error}
          onRetry={loadData}
          className="my-8"
        />
      )}

      {!error && (
      <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Achievements
              </CardTitle>
              <CardDescription>Track your wellness journey and unlock rewards</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {achievements.filter(a => a.unlocked).length}/{achievements.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="consistency" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Streak
                </TabsTrigger>
                <TabsTrigger value="wellness" className="text-xs">
                  <Heart className="h-3 w-3 mr-1" />
                  Wellness
                </TabsTrigger>
                <TabsTrigger value="improvement" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Growth
                </TabsTrigger>
                <TabsTrigger value="milestone" className="text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  Milestones
                </TabsTrigger>
                <TabsTrigger value="organization" className="text-xs">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Planning
                </TabsTrigger>
              </TabsList>

              {['all', 'consistency', 'wellness', 'improvement', 'milestone', 'organization'].map(category => (
                <TabsContent key={category} value={category} className="space-y-3 mt-0">
                  {achievements
                    .filter(a => category === 'all' || a.category === category)
                    .map(achievement => {
                      const progressPercent = achievement.maxProgress 
                        ? (achievement.progress! / achievement.maxProgress) * 100 
                        : 0;

                      return (
                        <Card 
                          key={achievement.id} 
                          className={cn(
                            "relative overflow-hidden transition-all",
                            achievement.unlocked 
                              ? "border-2 bg-gradient-to-r shadow-md" 
                              : "opacity-70 hover:opacity-100"
                          )}
                          style={achievement.unlocked ? {
                            borderImage: `linear-gradient(135deg, var(--tw-gradient-stops)) 1`,
                            backgroundImage: `linear-gradient(135deg, transparent, rgba(var(--primary-rgb, 0, 0, 0), 0.05))`
                          } : {}}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={cn(
                                "text-4xl shrink-0 transition-transform",
                                achievement.unlocked ? "scale-110" : "grayscale"
                              )}>
                                {achievement.unlocked ? achievement.icon : <Lock className="h-10 w-10 text-muted-foreground" />}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div>
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                      {achievement.title}
                                      {achievement.unlocked && (
                                        <Badge className={cn("text-[10px] px-1.5 py-0 bg-gradient-to-r", achievement.color)}>
                                          ✓ Unlocked
                                        </Badge>
                                      )}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {achievement.description}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress */}
                                {achievement.maxProgress && achievement.maxProgress > 1 && (
                                  <div className="mt-3 space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        {achievement.progress}/{achievement.maxProgress}
                                      </span>
                                      <span className="font-medium">
                                        {Math.round(progressPercent)}%
                                      </span>
                                    </div>
                                    <Progress 
                                      value={progressPercent} 
                                      className={cn(
                                        "h-2",
                                        achievement.unlocked && `bg-gradient-to-r ${achievement.color}`
                                      )}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  
                  {achievements.filter(a => category === 'all' || a.category === category).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No achievements in this category yet</p>
              </div>
                  )}
                </TabsContent>
            ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Full Assessment History</CardTitle>
          <CardDescription>Your ML-powered burnout scores (86% accuracy) - up to the last 20 full assessments.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No full assessments yet. Take a full assessment to see your history here.</p>
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis 
                  domain={[0, 100]} 
                  tickLine={false} 
                  axisLine={false} 
                  fontSize={11}
                  ticks={[0, 25, 50, 75, 100]}
                  width={35}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    const color = getScoreColor(payload.score || 0);
                    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
                  }} 
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
      
      {/* Daily Quick Checks Trend */}
      {quickCheckData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Daily Quick Checks</CardTitle>
            <CardDescription>
              Your last {quickCheckData.length} quick risk assessments - for daily monitoring only
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
                <LineChart data={quickCheckData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const color = getScoreColor(payload.score || 0);
                      return <circle key={`quick-dot-${index}`} cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1.5} />;
                    }} 
                  />
                </LineChart>
              </ChartContainer>
            )}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Quick checks are estimates for daily tracking. Your official burnout score comes from the Full Burnout Assessment (visible in "Full Assessment History" above).
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Complete History</CardTitle>
          <CardDescription>All assessments (Full + Quick Checks) - last 20 entries</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history.</p>
          ) : (
            <div className="text-sm overflow-x-auto">
              <div className="grid grid-cols-6 gap-2 font-medium text-muted-foreground min-w-[700px]">
                <div>Date</div>
                <div>Type</div>
                <div>Base Score</div>
                <div>Calendar</div>
                <div>Level</div>
                <div>Drivers</div>
              </div>
              <div className="mt-2 space-y-1">
                {history.slice(-20).reverse().map((h, idx) => {
                  const score = h.result?.burnout_score ?? 0;
                  const level = scoreToLevel(score);
                  const type = (h as any).type === 'burnout_assessment' ? 'Full Assessment' : 'Quick Check';
                  const typeColor = (h as any).type === 'burnout_assessment' ? 'text-primary font-semibold' : 'text-muted-foreground';
                  
                  // Show calendar contribution if this is a full assessment
                  const showCalendar = (h as any).type === 'burnout_assessment';
                  
                  return (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-center min-w-[700px]">
                      <div className="text-xs">{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className={`text-xs ${typeColor}`}>{type}</div>
                      <div>{Math.round(score)}</div>
                      <div className="text-xs">
                        {showCalendar ? (
                          <span className="text-muted-foreground">See Dashboard</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                      <div className={levelToColor(level).text}>{level}</div>
                      <div className="truncate text-xs">{(h.result?.top_drivers || []).join(', ')}</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                <strong>Note:</strong> Calendar stress is calculated in real-time on the Dashboard based on your upcoming events. For Full Assessments, the Dashboard shows: Base Score + Calendar Events = Total Score.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

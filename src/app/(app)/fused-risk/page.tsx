"use client";

import { useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle } from 'lucide-react';
import { api, apiSafe } from '@/lib/api';
import type { FusedPredictResponse, FusedPredictRequest } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

const dass21StressQuestions = [
    "I found it hard to wind down",
    "I tended to over-react to situations",
    "I found myself getting agitated",
    "I found it difficult to relax",
    "I was intolerant of anything that kept me from getting on with what I was doing",
    "I felt that I was using a lot of nervous energy",
    "I was irritable"
];

const scaleLabels = ['Never', 'Sometimes', 'Often', 'Almost Always'];

const fusedRiskSchema = z.object({
  s_answers: z.array(z.coerce.number().min(0).max(3)).length(7, "You must answer all 7 questions."),
});

type FusedRiskFormValues = z.infer<typeof fusedRiskSchema>;

export default function FusedRiskPage() {
  const [prediction, setPrediction] = useState<FusedPredictResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FusedRiskFormValues>({
    resolver: zodResolver(fusedRiskSchema),
    defaultValues: {
        s_answers: Array(7).fill(0),
    },
  });

  const onSubmit = async (data: FusedRiskFormValues) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    try {
      // Send only survey answers, no behavior data
      const r = await apiSafe.predictFused({ s_answers: data.s_answers, behavior: null });
      if (r.error || !r.data) throw new Error(r.error || 'Predict failed');
      setPrediction(r.data);
    } catch (e) {
      setError("An error occurred while fetching the prediction.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSave = async () => {
    if (!prediction) return;
    try {
      const res = await apiSafe.saveSurveyFull({ input: { sleep_hours: 0, study_hours: 0, assignments_due: 0, exams_within_7d: 0 } as any, fused: prediction, timestamp: new Date().toISOString() });
      if (res.error) throw new Error(res.error);
    } catch {}
  }
  
  return (
    <div className="container mx-auto max-w-4xl p-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">DASS-21 Stress Assessment</h1>
        <p className="text-muted-foreground">Assess your stress levels using the validated DASS-21 questionnaire.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle>DASS-21 Stress Assessment</CardTitle>
                <CardDescription>Answer 7 questions about your stress levels over the past week.</CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help ml-2" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="font-semibold mb-1">About DASS-21</p>
                    <p className="text-xs">The Depression, Anxiety and Stress Scale is a validated psychological assessment. Answer honestly based on how you felt over the past week. Scores range from 0-21 (raw) or 0-100 (normalized).</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Accordion type="single" defaultValue="item-1" collapsible>
                  <AccordionItem value='item-1'>
                    <AccordionTrigger>DASS-21 Stress Questions</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium mb-1">DASS-21 Stress Scale</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Rate how much each statement applied to you <strong>over the past week</strong>.
                        </p>
                        <div className="flex gap-2 text-xs">
                          {scaleLabels.map((label, i) => (
                            <span key={i} className="px-2 py-1 bg-background rounded border">
                              {i}: {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      {dass21StressQuestions.map((q, i) => (
                        <div key={i} className="space-y-2">
                          <Label>{i+1}. {q}</Label>
                          <Controller
                            name={`s_answers.${i}`}
                            control={form.control}
                            render={({ field }) => (
                              <RadioGroup value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} className="grid grid-cols-2 gap-2">
                                {[0,1,2,3].map(v => (
                                  <div key={v} className="flex items-center space-x-2">
                                    <RadioGroupItem id={`s_${i}_${v}`} value={String(v)} />
                                    <Label htmlFor={`s_${i}_${v}`} className="text-sm cursor-pointer">
                                      {scaleLabels[v]}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                          />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                {form.formState.errors.s_answers && <p className="text-sm text-destructive">{form.formState.errors.s_answers.message}</p>}
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 text-sm">
                  <p className="text-blue-900 dark:text-blue-200">
                    <strong>Note:</strong> This assessment uses only the DASS-21 survey. Behavioral tracking is coming in a future update.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Calculate Stress Risk
                </Button>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Stress Assessment Results</CardTitle>
            <CardDescription>Your stress risk score based on DASS-21.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
            {error && <div className="text-center text-destructive"><AlertCircle className="mx-auto mb-2 h-8 w-8" /><p>{error}</p></div>}
            {!isLoading && !error && !prediction && <p className="text-muted-foreground">Results will be shown here.</p>}
            {prediction && (
              <div className="w-full space-y-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Stress Risk Score</p>
                  <p className="text-6xl font-bold text-primary">{Math.round(prediction.final_score_0_100)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Based on DASS-21 Stress Scale (0-100)</p>
                </div>
                <Separator />
                <div className="space-y-2">
                    <p className="font-medium">Breakdown</p>
                    <div className="p-3 rounded-lg bg-muted">
                        <div className="text-sm text-muted-foreground mb-1">Raw Stress Score</div>
                        <div className="text-2xl font-semibold">{prediction.survey.predicted_stress_score} / 21</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Normalized: {Math.round(prediction.survey.survey_risk_0_100)} / 100
                        </div>
                    </div>
                </div>
                {Array.isArray(prediction.survey.top_drivers) && prediction.survey.top_drivers.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Top Survey Drivers</p>
                        <div className="flex flex-wrap justify-center gap-2">
                            {prediction.survey.top_drivers.map((driver: any, i: number) => {
                                const label =
                                  typeof driver === 'string'
                                    ? driver
                                    : driver?.feature
                                      ? `${driver.feature}${typeof driver.weight === 'number' ? ` (${driver.weight.toFixed(2)})` : ''}`
                                      : JSON.stringify(driver);
                                return <Badge key={i} variant="secondary">{label}</Badge>;
                            })}
                        </div>
                    </div>
                )}
                <Button className="w-full" onClick={onSave}>Save Result</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

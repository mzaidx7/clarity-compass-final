"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Gauge from "@/components/Gauge";
import ErrorState from "@/components/ErrorState";
import type { SurveyQuestion, AssessmentResponse } from "@/lib/types";

export default function AssessmentPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build dynamic schema based on fetched questions
  const [formSchema, setFormSchema] = useState<z.ZodObject<any>>(z.object({}));

  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoading(true);
        const qs = await api.getAssessmentQuestions();
        setQuestions(qs);
        
        // Build Zod schema
        const schemaShape: Record<string, z.ZodNumber> = {};
        qs.forEach(q => {
          if (q.id === 'mental_health_history') {
            schemaShape[q.id] = z.number().min(0).max(1);
          } else {
            schemaShape[q.id] = z.number().min(1).max(5);
          }
        });
        setFormSchema(z.object(schemaShape));
        setError(null);
      } catch (err: any) {
        console.error("Error loading questions:", err);
        setError(err.message || "Failed to load survey questions");
      } finally {
        setLoading(false);
      }
    }
    loadQuestions();
  }, []);

  const form = useForm<Record<string, number>>({
    resolver: zodResolver(formSchema),
    defaultValues: questions.reduce((acc, q) => {
      acc[q.id] = q.id === 'mental_health_history' ? 0 : 3;
      return acc;
    }, {} as Record<string, number>)
  });

  // Reset form when questions load
  useEffect(() => {
    if (questions.length > 0) {
      const defaults = questions.reduce((acc, q) => {
        acc[q.id] = q.id === 'mental_health_history' ? 0 : 3;
        return acc;
      }, {} as Record<string, number>);
      form.reset(defaults);
    }
  }, [questions, form]);

  async function onSubmit(data: Record<string, number>) {
    try {
      setSubmitting(true);
      setError(null);
      const response = await api.submitAssessment({ responses: data });
      setResult(response.result);
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  }

  function getRiskColor(level: string) {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'moderate': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'severe': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  function getRiskIcon(level: string) {
    switch (level) {
      case 'low': return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case 'moderate': return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
      case 'high': return <AlertCircle className="h-8 w-8 text-orange-600" />;
      case 'severe': return <AlertTriangle className="h-8 w-8 text-red-600" />;
      default: return <HelpCircle className="h-8 w-8 text-gray-600" />;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <ErrorState
        title="Failed to Load Assessment"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (result) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Burnout Assessment Results</CardTitle>
            <CardDescription>
              Based on your responses, here's your comprehensive burnout risk analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Gauge Display */}
            <div className="flex justify-center">
              <Gauge
                value={result.burnout_score}
                size={200}
                strokeWidth={20}
                label="Burnout Score"
              />
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-center gap-3">
              {getRiskIcon(result.risk_level)}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Risk Level</p>
                <p className={`text-2xl font-bold capitalize ${getRiskColor(result.risk_level)}`}>
                  {result.risk_level}
                </p>
              </div>
            </div>

            {/* Top Risk Factors */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Top Risk Factors</h3>
              <div className="space-y-3">
                {result.top_risk_factors.map((factor, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{factor.factor}</span>
                      <span className="text-sm text-muted-foreground">
                        {factor.value.toFixed(1)}% intensity
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${factor.risk_contribution}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Contributes {factor.risk_contribution.toFixed(1)}% to overall risk
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Model Info */}
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Analysis Details:</strong><br />
                • ML Model Accuracy: {(result.model_confidence * 100).toFixed(1)}% (R² = {result.model_confidence.toFixed(3)})<br />
                • Questions Analyzed: {questions.length} comprehensive factors<br />
                • Feature Interactions: Advanced polynomial analysis<br />
                • Prediction Type: {result.using_model ? 'ML-Powered' : 'Heuristic'}
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={() => router.push('/dashboard')} className="flex-1">
                View Dashboard
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="flex-1">
                Take Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Burnout Assessment</CardTitle>
          <CardDescription>
            Answer {questions.length} questions to get an accurate burnout risk assessment powered by machine learning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Group questions by category */}
              {(() => {
                const categories = Array.from(new Set(questions.map(q => (q as any).category || 'General')));
                return categories.map(category => {
                  const categoryQuestions = questions.filter(q => (q as any).category === category || (!( q as any).category && category === 'General'));
                  if (categoryQuestions.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary border-b pb-2">
                        {category}
                      </h3>
                      {categoryQuestions.map((question, idx) => {
                        const globalIdx = questions.indexOf(question);
                        return (
                          <FormField
                            key={question.id}
                            control={form.control}
                            name={question.id}
                            render={({ field }) => (
                              <FormItem className="space-y-3 pl-4">
                                <div className="flex items-center gap-2">
                                  <FormLabel className="text-base">
                                    {globalIdx + 1}. {question.question}
                                  </FormLabel>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-sm max-w-xs">{question.scale}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <FormControl>
                                  {question.id === 'mental_health_history' ? (
                                    <RadioGroup
                                      onValueChange={(val) => field.onChange(Number(val))}
                                      value={String(field.value)}
                                      className="flex gap-4"
                                    >
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="0" id={`${question.id}-0`} />
                                        <label htmlFor={`${question.id}-0`} className="text-sm cursor-pointer">No</label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="1" id={`${question.id}-1`} />
                                        <label htmlFor={`${question.id}-1`} className="text-sm cursor-pointer">Yes</label>
                                      </div>
                                    </RadioGroup>
                                  ) : (
                                    <RadioGroup
                                      onValueChange={(val) => field.onChange(Number(val))}
                                      value={String(field.value)}
                                      className="flex gap-3 flex-wrap"
                                    >
                                      {[1, 2, 3, 4, 5].map(val => (
                                        <div key={val} className="flex items-center space-x-2">
                                          <RadioGroupItem value={String(val)} id={`${question.id}-${val}`} />
                                          <label htmlFor={`${question.id}-${val}`} className="text-sm cursor-pointer">{val}</label>
                                        </div>
                                      ))}
                                    </RadioGroup>
                                  )}
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </div>
                  );
                });
              })()}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="sticky bottom-4 bg-background/95 backdrop-blur pt-4 border-t">
                <Button type="submit" className="w-full" disabled={submitting} size="lg">
                  {submitting ? "Analyzing..." : "Submit Assessment"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


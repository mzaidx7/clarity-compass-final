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
import { AlertCircle, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, HelpCircle, Brain } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import Gauge from "@/components/Gauge";
import ErrorState from "@/components/ErrorState";
import { levelToColor } from "@/lib/utils";
import type { SurveyQuestion, AssessmentResponse, RiskLevel } from "@/lib/types";

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
    const riskColors = levelToColor(result.risk_level as RiskLevel);
    
    return (
      <div className="space-y-6">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Your Burnout Assessment Results</CardTitle>
            </div>
            <CardDescription>
              Based on your responses, here's your comprehensive burnout risk analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Gauge Display with dynamic color */}
            <div className="flex justify-center py-6">
              <Gauge
                value={result.burnout_score}
                size={240}
                colorClass={riskColors.text}
                glow={true}
                glowColor={riskColors.glow}
                label="Burnout Score"
              />
            </div>

            {/* Risk Level Badge */}
            <div className="flex items-center justify-center gap-4">
              {getRiskIcon(result.risk_level)}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Risk Level</p>
                <Badge 
                  variant="outline" 
                  className={`text-xl px-4 py-2 capitalize ${getRiskColor(result.risk_level)} border-current`}
                >
                  {result.risk_level}
                </Badge>
              </div>
            </div>

            {/* Top Risk Factors */}
            <div className="bg-muted/30 p-6 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-destructive" />
                <h3 className="text-lg font-bold">Top Risk Factors</h3>
              </div>
              <div className="space-y-4">
                {result.top_risk_factors.map((factor, idx) => (
                  <div key={idx} className="bg-background p-4 rounded-lg border-2 space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-2 flex-1">
                        <Badge variant="secondary" className="mt-0.5 shrink-0">
                          #{idx + 1}
                        </Badge>
                        <span className="font-semibold text-sm leading-relaxed">{factor.factor}</span>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {factor.value.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          factor.risk_contribution > 60 ? 'bg-red-500' :
                          factor.risk_contribution > 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(factor.risk_contribution, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contributing {factor.risk_contribution.toFixed(1)}% to your overall burnout score
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Info */}
            <Alert className="bg-primary/5 border-primary/20">
              <Brain className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm space-y-1">
                <p className="font-semibold text-primary mb-2">AI Analysis Details</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Model Accuracy:</span>
                    <p className="font-medium">{(result.model_confidence * 100).toFixed(1)}% (R² = {result.model_confidence.toFixed(3)})</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Analysis Type:</span>
                    <p className="font-medium">{result.using_model ? 'Machine Learning' : 'Heuristic'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Factors Analyzed:</span>
                    <p className="font-medium">{questions.length} comprehensive dimensions</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Feature Processing:</span>
                    <p className="font-medium">Polynomial Interactions</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button onClick={() => router.push('/dashboard')} className="flex-1 shadow-md" size="lg">
                View Dashboard
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="flex-1" size="lg">
                Retake Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Comprehensive Burnout Assessment</CardTitle>
          </div>
          <CardDescription className="text-base">
            Answer {questions.length} questions to get an accurate burnout risk assessment powered by machine learning.
            Your responses will be analyzed using advanced AI to provide personalized insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Group questions by category */}
              {(() => {
                const categories = Array.from(new Set(questions.map(q => (q as any).category || 'General')));
                return categories.map(category => {
                  const categoryQuestions = questions.filter(q => (q as any).category === category || (!( q as any).category && category === 'General'));
                  if (categoryQuestions.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-5">
                      <div className="flex items-center gap-2 pb-3 border-b-2 border-primary/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        <h3 className="text-xl font-bold text-primary">
                          {category}
                        </h3>
                      </div>
                      {categoryQuestions.map((question, idx) => {
                        const globalIdx = questions.indexOf(question);
                        return (
                          <FormField
                            key={question.id}
                            control={form.control}
                            name={question.id}
                            render={({ field }) => (
                              <FormItem className="space-y-4 p-4 rounded-lg bg-card/50 border">
                                <div className="flex items-start gap-3">
                                  <Badge variant="outline" className="mt-1 shrink-0">
                                    {globalIdx + 1}
                                  </Badge>
                                  <div className="flex-1">
                                    <div className="flex items-start gap-2">
                                      <FormLabel className="text-base font-medium leading-relaxed">
                                        {question.question}
                                      </FormLabel>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="h-4 w-4 mt-1 text-muted-foreground cursor-help shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-sm">
                                            <p className="text-sm">{question.scale}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </div>
                                </div>
                                <FormControl>
                                  {question.id === 'mental_health_history' ? (
                                    <RadioGroup
                                      onValueChange={(val) => field.onChange(Number(val))}
                                      value={String(field.value)}
                                      className="flex gap-3"
                                    >
                                      {['No', 'Yes'].map((label, idx) => (
                                        <label
                                          key={idx}
                                          htmlFor={`${question.id}-${idx}`}
                                          className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                                            field.value === idx
                                              ? 'border-primary bg-primary/10 shadow-sm'
                                              : 'border-border hover:border-primary/50 hover:bg-accent'
                                          }`}
                                        >
                                          <RadioGroupItem value={String(idx)} id={`${question.id}-${idx}`} className="sr-only" />
                                          <span className="font-medium text-sm">{label}</span>
                                        </label>
                                      ))}
                                    </RadioGroup>
                                  ) : (
                                    <RadioGroup
                                      onValueChange={(val) => field.onChange(Number(val))}
                                      value={String(field.value)}
                                      className="grid grid-cols-5 gap-2"
                                    >
                                      {(() => {
                                        // Parse scale labels from question.scale
                                        const scaleLabels = question.scale.split('|').map(s => s.trim().split(' - ')[1] || s.trim());
                                        return [1, 2, 3, 4, 5].map(val => (
                                          <label
                                            key={val}
                                            htmlFor={`${question.id}-${val}`}
                                            className={`flex flex-col items-center justify-center px-2 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                                              field.value === val
                                                ? 'border-primary bg-primary/10 shadow-sm'
                                                : 'border-border hover:border-primary/50 hover:bg-accent'
                                            }`}
                                          >
                                            <RadioGroupItem value={String(val)} id={`${question.id}-${val}`} className="sr-only" />
                                            <span className="text-lg font-semibold mb-1">{val}</span>
                                            <span className="text-xs text-center text-muted-foreground leading-tight">
                                              {scaleLabels[val - 1] || val}
                                            </span>
                                          </label>
                                        ));
                                      })()}
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
                <Alert variant="destructive" className="border-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 -mx-6 px-6">
                <Button 
                  type="submit" 
                  className="w-full text-lg shadow-lg" 
                  disabled={submitting} 
                  size="lg"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 animate-pulse" />
                      Analyzing Your Responses...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Submit Assessment
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}


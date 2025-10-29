import { API_BASE_URL, USE_MOCK_API } from './config';
import type {
  SurveyRequest,
  PredictionResponse,
  FusedPredictRequest,
  FusedPredictResponse,
  ForecastRequest,
  ForecastResponse,
  HealthResponse,
  ModelStatusResponse,
  DevLoginRequest,
  DevLoginResponse,
  SurveyHistoryResponse,
  SurveySaveFullRequest,
  CalendarEventServer,
  CalendarEventCreateServer,
  CalendarMonthDaysResponse,
  SurveyQuestion,
  AssessmentRequest,
  AssessmentResponse,
  ModelInfo
} from './types';

const MOCK_LATENCY_MS = 600;

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const getAuthHeaders = (): Record<string, string> => {
  return authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
};

type ApiResult<T> = { data?: T; error?: string };

async function http<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...getAuthHeaders(),
      } as HeadersInit,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { error: text || `HTTP ${res.status}` };
    }
    const json = (await res.json()) as T;
    return { data: json };
  } catch (e: any) {
    return { error: e?.message || 'Network error' };
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Utility to generate a minimal unsigned JWT-like token for dev use
const createFakeJwt = (userId: string): string => {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  const toBase64Url = (obj: any) => {
    const json = JSON.stringify(obj);
    // btoa may not exist in SSR; provide a fallback
    const base64 =
      typeof btoa === 'function'
        ? btoa(json)
        : Buffer.from(json, 'utf-8').toString('base64');
    return base64.replace(/=+/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };
  return `${toBase64Url(header)}.${toBase64Url(payload)}.`; // empty signature
};

const mockApi = {
  health: async (): Promise<HealthResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    return { status: 'ok', version: '0.1.0 (mock)' };
  },
  
  status: async (): Promise<ModelStatusResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    return {
      using: 'Mock Model v1',
      model_loaded: true,
      scaler_loaded: true,
      features: ['sleep_hours', 'study_hours', 'assignments_due', 'exams_within_7d'],
      artifact_flags: { 'dass21_model': true, 'behavior_model': false },
    };
  },

  predict: async (data: SurveyRequest): Promise<PredictionResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));

    const { sleep_hours, study_hours, assignments_due, exams_within_7d } = data;
    
    const score = clamp(
      study_hours * 3 + assignments_due * 5 + exams_within_7d * 7 - sleep_hours * 2,
      0,
      100
    );

    let risk_label: 'Low' | 'Moderate' | 'High';
    if (score < 40) risk_label = 'Low';
    else if (score < 70) risk_label = 'Moderate';
    else risk_label = 'High';

    const drivers = [];
    if (study_hours > 8) drivers.push('High Study Hours');
    if (sleep_hours < 6) drivers.push('Low Sleep Hours');
    if (assignments_due > 3) drivers.push('Many Assignments');
    if (exams_within_7d > 1) drivers.push('Upcoming Exams');

    return {
      burnout_score: score,
      risk_label,
      top_drivers: drivers.slice(0, 2),
    };
  },
  
  saveSurvey: async (data: SurveyRequest): Promise<{ status: string, message: string }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    console.log("Saving survey data (mock):", data);
    return { status: 'ok', message: 'Risk assessment saved successfully.' };
  },
  getSurveyHistory: async (limit: number = 20): Promise<SurveyHistoryResponse> => {
    await new Promise(r => setTimeout(r, MOCK_LATENCY_MS));
    return { items: [] };
  },
  getCalendarEvents: async (date?: string): Promise<CalendarEventServer[]> => {
    await new Promise(r => setTimeout(r, MOCK_LATENCY_MS));
    return [];
  },
  addCalendarEvent: async (event: CalendarEventCreateServer): Promise<CalendarEventServer> => {
    await new Promise(r => setTimeout(r, MOCK_LATENCY_MS));
    return { id: String(Date.now()), ...event } as CalendarEventServer;
  },
  deleteCalendarEvent: async (id: string): Promise<{ status: string }> => {
    await new Promise(r => setTimeout(r, MOCK_LATENCY_MS));
    return { status: 'ok' };
  },
  getCalendarMonthDays: async (year: number, month: number): Promise<CalendarMonthDaysResponse> => {
    await new Promise(r => setTimeout(r, MOCK_LATENCY_MS));
    return { days: [] };
  },
  saveSurveyFull: async (payload: SurveySaveFullRequest): Promise<{ status: string, message: string }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    console.log("Saving survey full (mock):", payload);
    return { status: 'ok', message: 'Saved (mock)' };
  },
  
  predictFused: async (data: FusedPredictRequest): Promise<FusedPredictResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));

    const { s_answers } = data;
    // Calculate raw stress score (sum of 7 DASS-21 items, each 0-3, max 21)
    const stressScore = s_answers.reduce((sum, val) => sum + val, 0);
    // Normalize to 0-100 scale
    const surveyRisk = clamp((stressScore / 21) * 100, 0, 100);

    // Mock top drivers based on highest rated items
    const drivers = s_answers
      .map((val, idx) => ({ idx: idx + 1, val }))
      .filter(d => d.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, 3)
      .map(d => ({ feature: `S${d.idx}`, weight: d.val / 3 }));

    const response: FusedPredictResponse = {
      survey: {
        predicted_stress_score: stressScore,
        survey_risk_0_100: Math.round(surveyRisk),
        top_drivers: drivers,
      },
      behavior: null,
      final_score_0_100: Math.round(surveyRisk),
    };
    
    return response;
  },

  forecast: async (data: ForecastRequest): Promise<ForecastResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    
    const { last14, deadlines_next7, alpha = 0.5, deadline_weight = 2 } = data;
    
    const pred: number[] = [];
    let last_smooth = last14[last14.length - 1];

    for (let i = 0; i < 7; i++) {
      last_smooth = alpha * last14[last14.length - 1] + (1 - alpha) * last_smooth;
      let forecast = last_smooth;
      if (deadlines_next7 && deadlines_next7[i] > 0) {
        forecast += deadline_weight * deadlines_next7[i];
      }
      pred.push(clamp(forecast, 0, 100));
    }
    
    const conf = pred.map(p => clamp(p + 10, 0, 100));
    
    const drivers = ["Stable baseline"];
    if (last14[last14.length-1] > last14[0]) {
        drivers.push("Recent trend up");
    } else {
        drivers.push("Recent trend down");
    }
    if(deadlines_next7 && deadlines_next7.some(d => d > 0)) {
        drivers.push("Deadlines impact");
    }

    return { pred, conf, drivers };
  },
  devLogin: async (data: DevLoginRequest): Promise<DevLoginResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    return { access_token: createFakeJwt(data.user_id) };
  },
  
  // ========== Assessment Endpoints (New ML Model) ==========
  getAssessmentQuestions: async (): Promise<SurveyQuestion[]> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    // Mock 19 survey questions matching v2 model
    return [
      { id: "anxiety", question: "How often do you feel anxious or worried?", scale: "Never (1) - Always (5)", weight: 0.18 },
      { id: "self_esteem", question: "How confident do you feel about yourself?", scale: "Very confident (1) - Not confident at all (5)", weight: 0.50 },
      { id: "depression", question: "How often do you feel sad or depressed?", scale: "Never (1) - Always (5)", weight: 0.08 },
      { id: "sleep_quality", question: "How would you rate your sleep quality?", scale: "Excellent (1) - Very Poor (5)", weight: 0.04 },
      { id: "academic_performance", question: "How satisfied are you with your academic performance?", scale: "Very satisfied (1) - Very dissatisfied (5)", weight: 0.06 },
      { id: "study_load", question: "How heavy is your current study workload?", scale: "Very light (1) - Overwhelming (5)", weight: 0.05 },
      { id: "future_career_concerns", question: "How worried are you about your future career?", scale: "Not worried (1) - Extremely worried (5)", weight: 0.02 },
      { id: "social_support", question: "How supported do you feel by friends and family?", scale: "Very supported (1) - Not supported at all (5)", weight: 0.04 },
      { id: "peer_pressure", question: "How much pressure do you feel from peers?", scale: "No pressure (1) - Extreme pressure (5)", weight: 0.02 },
      { id: "mental_health_history", question: "Do you have a personal or family history of mental health issues?", scale: "No (0) - Yes (1)", weight: 0.02 },
      { id: "headache", question: "How often do you experience headaches?", scale: "Never (1) - Very frequently (5)", weight: 0.03 },
      { id: "blood_pressure", question: "Do you experience high blood pressure or related symptoms?", scale: "Never (1) - Frequently (5)", weight: 0.03 },
      { id: "breathing_problem", question: "Do you experience breathing difficulties or shortness of breath?", scale: "Never (1) - Frequently (5)", weight: 0.03 },
      { id: "noise_level", question: "How much does noise in your environment affect you?", scale: "Not at all (1) - Severely (5)", weight: 0.02 },
      { id: "living_conditions", question: "How satisfied are you with your living conditions?", scale: "Very satisfied (1) - Very dissatisfied (5)", weight: 0.03 },
      { id: "safety", question: "How safe do you feel in your daily environment?", scale: "Very safe (1) - Very unsafe (5)", weight: 0.02 },
      { id: "basic_needs", question: "Are your basic needs (food, shelter, finances) being met?", scale: "Fully met (1) - Not met at all (5)", weight: 0.03 },
      { id: "bullying", question: "Have you experienced bullying or harassment?", scale: "Never (1) - Frequently (5)", weight: 0.02 },
      { id: "extracurricular_activities", question: "How balanced is your time between studies and extracurricular activities?", scale: "Well balanced (1) - Very imbalanced (5)", weight: 0.02 },
    ];
  },
  
  predictAssessment: async (data: AssessmentRequest): Promise<AssessmentResponse> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    
    // Calculate burnout score from responses
    const { responses } = data;
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(responses).forEach(([key, value]) => {
      const normalized = key === 'mental_health_history' ? value * 100 : ((value - 1) / 4) * 100;
      const weight = 1; // Simplified for mock
      totalScore += normalized * weight;
      totalWeight += weight;
    });
    
    const burnoutScore = clamp(totalScore / totalWeight, 0, 100);
    
    let riskLevel: 'low' | 'moderate' | 'high' | 'severe';
    if (burnoutScore < 30) riskLevel = 'low';
    else if (burnoutScore < 50) riskLevel = 'moderate';
    else if (burnoutScore < 70) riskLevel = 'high';
    else riskLevel = 'severe';
    
    // Mock top risk factors
    const topFactors = Object.entries(responses)
      .map(([key, value]) => ({
        factor: key.replace(/_/g, ' '),
        value: key === 'mental_health_history' ? value * 100 : ((value - 1) / 4) * 100,
        importance: Math.random() * 50,
        risk_contribution: Math.random() * 100
      }))
      .sort((a, b) => b.risk_contribution - a.risk_contribution)
      .slice(0, 3);
    
    return {
      burnout_score: Math.round(burnoutScore * 100) / 100,
      risk_level: riskLevel,
      top_risk_factors: topFactors,
      using_model: true,
      model_confidence: 0.64
    };
  },
  
  submitAssessment: async (data: AssessmentRequest): Promise<{ success: boolean; result: AssessmentResponse }> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    const result = await mockApi.predictAssessment(data);
    console.log("Saving assessment (mock):", data);
    return { success: true, result };
  },
  
  getModelInfo: async (): Promise<ModelInfo> => {
    await new Promise(resolve => setTimeout(resolve, MOCK_LATENCY_MS));
    return {
      model_type: 'RandomForestRegressor v2 (mock)',
      features: 19,
      r2_score: 0.86,
      rmse: 9.37,
      cv_score: 0.865,
      train_samples: 1488,
      test_samples: 372
    };
  }
};

const liveApi = {
    health: async (): Promise<HealthResponse> => {
        const r = await http<HealthResponse>(`${API_BASE_URL}/auth/health`);
        if (r.error || !r.data) throw new Error(r.error || 'Failed to fetch health');
        return r.data;
    },
    status: async (): Promise<ModelStatusResponse> => {
        const r = await http<ModelStatusResponse>(`${API_BASE_URL}/predict/status`);
        if (r.error || !r.data) throw new Error(r.error || 'Failed to fetch status');
        return r.data;
    },
    predict: async (data: SurveyRequest): Promise<PredictionResponse> => {
        const r = await http<PredictionResponse>(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Prediction failed');
        return r.data;
    },
    saveSurvey: async (data: SurveyRequest): Promise<{ status: string, message: string }> => {
        const r = await http<{ status: string, message: string }>(`${API_BASE_URL}/survey/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Save survey failed');
        return r.data;
    },
    saveSurveyFull: async (payload: SurveySaveFullRequest): Promise<{ status: string, message: string }> => {
        const r = await http<{ status: string, message: string }>(`${API_BASE_URL}/survey/save_full`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Save survey failed');
        return r.data;
    },
    predictFused: async (data: FusedPredictRequest): Promise<FusedPredictResponse> => {
        const r = await http<FusedPredictResponse>(`${API_BASE_URL}/predict/fused`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Fused prediction failed');
        return r.data;
    },
    forecast: async (data: ForecastRequest): Promise<ForecastResponse> => {
        const r = await http<ForecastResponse>(`${API_BASE_URL}/forecast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Forecast failed');
        return r.data;
    },
    devLogin: async (data: DevLoginRequest): Promise<DevLoginResponse> => {
        const res = await fetch(`${API_BASE_URL}/auth/dev-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Dev login failed');
        const json = await res.json();
        if (json && typeof json === 'object' && 'token' in json && !('access_token' in json)) {
            return { access_token: json.token } as DevLoginResponse;
        }
        return json as DevLoginResponse;
    },
    getSurveyHistory: async (limit: number = 20): Promise<SurveyHistoryResponse> => {
        const r = await http<SurveyHistoryResponse>(`${API_BASE_URL}/survey/history?limit=${limit}`);
        if (r.error || !r.data) throw new Error(r.error || 'Fetch history failed');
        return r.data;
    },
    getCalendarEvents: async (date?: string): Promise<CalendarEventServer[]> => {
        const url = new URL(`${API_BASE_URL}/calendar/events`);
        if (date) url.searchParams.set('date', date);
        const r = await http<CalendarEventServer[]>(url.toString());
        if (r.error || !r.data) throw new Error(r.error || 'Fetch events failed');
        return r.data;
    },
    addCalendarEvent: async (event: CalendarEventCreateServer): Promise<CalendarEventServer> => {
        const r = await http<CalendarEventServer>(`${API_BASE_URL}/calendar/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Add event failed');
        return r.data;
    },
    deleteCalendarEvent: async (id: string): Promise<{ status: string }> => {
        const r = await http<{ status: string }>(`${API_BASE_URL}/calendar/events/${id}`, {
            method: 'DELETE',
        });
        if (r.error || !r.data) throw new Error(r.error || 'Delete event failed');
        return r.data;
    },
    getCalendarMonthDays: async (year: number, month: number): Promise<CalendarMonthDaysResponse> => {
        const url = new URL(`${API_BASE_URL}/calendar/events/month`);
        url.searchParams.set('year', String(year));
        url.searchParams.set('month', String(month));
        const r = await http<CalendarMonthDaysResponse>(url.toString());
        if (r.error || !r.data) throw new Error(r.error || 'Fetch month days failed');
        return r.data;
    },
    // ========== Assessment Endpoints (New ML Model) ==========
    getAssessmentQuestions: async (): Promise<SurveyQuestion[]> => {
        const r = await http<SurveyQuestion[]>(`${API_BASE_URL}/assessment/questions`);
        if (r.error || !r.data) throw new Error(r.error || 'Fetch questions failed');
        return r.data;
    },
    predictAssessment: async (data: AssessmentRequest): Promise<AssessmentResponse> => {
        const r = await http<AssessmentResponse>(`${API_BASE_URL}/assessment/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Assessment prediction failed');
        return r.data;
    },
    submitAssessment: async (data: AssessmentRequest): Promise<{ success: boolean; result: AssessmentResponse }> => {
        const r = await http<{ success: boolean; result: AssessmentResponse }>(`${API_BASE_URL}/assessment/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (r.error || !r.data) throw new Error(r.error || 'Submit assessment failed');
        return r.data;
    },
    getModelInfo: async (): Promise<ModelInfo> => {
        const r = await http<ModelInfo>(`${API_BASE_URL}/assessment/model-info`);
        if (r.error || !r.data) throw new Error(r.error || 'Fetch model info failed');
        return r.data;
    },
    // ========== Data Management Endpoints ==========
    clearAllData: async (): Promise<{ success: boolean; message: string; items_cleared: number }> => {
        const r = await http<{ success: boolean; message: string; items_cleared: number }>(`${API_BASE_URL}/data/clear-all`, {
            method: 'DELETE',
        });
        if (r.error || !r.data) throw new Error(r.error || 'Clear data failed');
        return r.data;
    },
};

// Safe API that always returns {data?, error?}
export const apiSafe = {
  health: () => http<HealthResponse>(`${API_BASE_URL}/auth/health`),
  status: () => http<ModelStatusResponse>(`${API_BASE_URL}/predict/status`),
  predict: (body: SurveyRequest) => http<PredictionResponse>(`${API_BASE_URL}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  saveSurveyFull: (payload: SurveySaveFullRequest) => http<{ status: string }>(`${API_BASE_URL}/survey/save_full`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  history: (limit = 20) => http<SurveyHistoryResponse>(`${API_BASE_URL}/survey/history?limit=${limit}`),
  predictFused: (body: FusedPredictRequest) => http<FusedPredictResponse>(`${API_BASE_URL}/predict/fused`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  forecast: (body: ForecastRequest) => http<ForecastResponse>(`${API_BASE_URL}/forecast`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  calendarList: (date?: string) => {
    const url = new URL(`${API_BASE_URL}/calendar/events`);
    if (date) url.searchParams.set('date', date);
    return http<CalendarEventServer[]>(url.toString());
  },
  calendarAdd: (e: CalendarEventCreateServer) => http<CalendarEventServer>(`${API_BASE_URL}/calendar/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(e) }),
  calendarDelete: (id: string) => http<{ status: string }>(`${API_BASE_URL}/calendar/events/${id}`, { method: 'DELETE' }),
  calendarMonthDays: (year: number, month: number) => {
    const url = new URL(`${API_BASE_URL}/calendar/events/month`);
    url.searchParams.set('year', String(year));
    url.searchParams.set('month', String(month));
    return http<CalendarMonthDaysResponse>(url.toString());
  },
  // Assessment endpoints
  assessmentQuestions: () => http<SurveyQuestion[]>(`${API_BASE_URL}/assessment/questions`),
  assessmentPredict: (body: AssessmentRequest) => http<AssessmentResponse>(`${API_BASE_URL}/assessment/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  assessmentSubmit: (body: AssessmentRequest) => http<{ success: boolean; result: AssessmentResponse }>(`${API_BASE_URL}/assessment/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  modelInfo: () => http<ModelInfo>(`${API_BASE_URL}/assessment/model-info`),
  // Data management
  clearAllData: () => http<{ success: boolean; message: string; items_cleared: number }>(`${API_BASE_URL}/data/clear-all`, { method: 'DELETE' }),
};

export const api = USE_MOCK_API ? mockApi : liveApi;

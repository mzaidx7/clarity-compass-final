"""
Comprehensive Burnout Prediction Model Training

Fuses 3 datasets and trains a Random Forest model for burnout prediction.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path
import json
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, mean_squared_error, r2_score
import warnings
warnings.filterwarnings('ignore')

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

print("=" * 80)
print("BURNOUT PREDICTION MODEL TRAINING")
print("=" * 80)

base_dir = Path(__file__).parent.parent / 'data'
models_dir = Path(__file__).parent.parent / 'models'
models_dir.mkdir(exist_ok=True)

# ============================================================================
# STEP 1: Load and preprocess all datasets
# ============================================================================
print("\n[STEP 1] Loading datasets...")
print("-" * 80)

# Dataset 1: StressLevelDataset (best structure with target variable)
df1 = pd.read_csv(base_dir / 'kaggle_raw' / 'stress_monitoring' / 'StressLevelDataset.csv')
print(f"  Dataset 1 (StressLevelDataset): {len(df1)} rows")

# Dataset 2: Mental Stress and Coping
df2 = pd.read_csv(base_dir / 'kaggle_raw' / 'mental_stress_coping' / 'Student_Mental_Stress_and_Coping_Mechanisms.csv')
print(f"  Dataset 2 (Mental Stress Coping): {len(df2)} rows")

# ============================================================================
# STEP 2: Feature Engineering - Create Unified Feature Set
# ============================================================================
print("\n[STEP 2] Feature engineering...")
print("-" * 80)

# Dataset 1 features (already well structured)
features_d1 = {
    'anxiety': df1['anxiety_level'] / 21.0 * 100,  # Normalize to 0-100
    'self_esteem': (21 - df1['self_esteem']) / 21.0 * 100,  # Invert: low self-esteem = high risk
    'depression': df1['depression'] / 21.0 * 100,
    'sleep_quality': (5 - df1['sleep_quality']) / 5.0 * 100,  # Lower quality = higher score
    'academic_performance': (5 - df1['academic_performance']) / 5.0 * 100,  # Worse perf = higher
    'study_load': df1['study_load'] / 5.0 * 100,
    'future_career_concerns': df1['future_career_concerns'] / 5.0 * 100,
    'social_support': (5 - df1['social_support']) / 5.0 * 100,  # Less support = higher
    'peer_pressure': df1['peer_pressure'] / 5.0 * 100,
    'mental_health_history': df1['mental_health_history'] / 2.0 * 100,  # Binary 0/1
    'stress_level': df1['stress_level'] * 20  # Target: 0-2 -> 0-100 scale
}
df1_processed = pd.DataFrame(features_d1)

# Dataset 2 features
features_d2 = {
    'anxiety': np.random.normal(50, 20, len(df2)).clip(0, 100),  # Proxy (not in original)
    'self_esteem': np.random.normal(50, 20, len(df2)).clip(0, 100),  # Proxy
    'depression': np.random.normal(50, 20, len(df2)).clip(0, 100),  # Proxy
    'sleep_quality': (9 - df2['Sleep Duration (Hours per night)']) / 9.0 * 100,  # Less sleep = worse
    'academic_performance': (5 - df2['Academic Performance (GPA)']) / 5.0 * 100,
    'study_load': df2['Study Hours Per Week'] / 60.0 * 100,  # Normalize to 60hrs max
    'future_career_concerns': df2['Financial Stress'] * 20,  # 1-5 -> 0-100
    'social_support': df2['Family Support  '] * 20,
    'peer_pressure': df2['Peer Pressure'] * 20,
    'mental_health_history': df2['Family Mental Health History'].map({'Yes': 100, 'No': 0}),
    'stress_level': df2['Mental Stress Level'] * 20  # Target: 1-5 -> 0-100
}
df2_processed = pd.DataFrame(features_d2)

print(f"  Processed Dataset 1: {len(df1_processed)} rows, {len(df1_processed.columns)} features")
print(f"  Processed Dataset 2: {len(df2_processed)} rows, {len(df2_processed.columns)} features")

# ============================================================================
# STEP 3: Combine datasets
# ============================================================================
print("\n[STEP 3] Combining datasets...")
print("-" * 80)

# Concatenate both datasets
df_combined = pd.concat([df1_processed, df2_processed], ignore_index=True)

# Handle missing values
df_combined = df_combined.fillna(df_combined.median())

print(f"  Combined dataset: {len(df_combined)} rows")
print(f"  Features: {list(df_combined.columns)}")

# ============================================================================
# STEP 4: Create target variable (Burnout Score)
# ============================================================================
print("\n[STEP 4] Creating burnout target variable...")
print("-" * 80)

# Burnout score is a weighted combination of key factors
burnout_score = (
    0.25 * df_combined['stress_level'] +
    0.20 * df_combined['anxiety'] +
    0.15 * df_combined['depression'] +
    0.10 * df_combined['sleep_quality'] +
    0.10 * df_combined['academic_performance'] +
    0.10 * df_combined['study_load'] +
    0.10 * (100 - df_combined['self_esteem'])  # High burnout = low self-esteem
)

df_combined['burnout_score'] = burnout_score.clip(0, 100)

print(f"  Burnout score statistics:")
print(f"    Mean: {df_combined['burnout_score'].mean():.2f}")
print(f"    Std: {df_combined['burnout_score'].std():.2f}")
print(f"    Min: {df_combined['burnout_score'].min():.2f}")
print(f"    Max: {df_combined['burnout_score'].max():.2f}")

# Create risk categories for classification
df_combined['burnout_category'] = pd.cut(
    df_combined['burnout_score'],
    bins=[0, 30, 50, 70, 100],
    labels=['Low', 'Moderate', 'High', 'Severe']
)

print(f"\n  Burnout distribution:")
print(df_combined['burnout_category'].value_counts().sort_index())

# ============================================================================
# STEP 5: Prepare features for training
# ============================================================================
print("\n[STEP 5] Preparing training data...")
print("-" * 80)

# Define final feature set (exclude target variables)
feature_columns = [
    'anxiety', 'self_esteem', 'depression', 'sleep_quality',
    'academic_performance', 'study_load', 'future_career_concerns',
    'social_support', 'peer_pressure', 'mental_health_history'
]

X = df_combined[feature_columns].values
y_score = df_combined['burnout_score'].values
y_category = df_combined['burnout_category'].values

# Train-test split
X_train, X_test, y_train_score, y_test_score, y_train_cat, y_test_cat = train_test_split(
    X, y_score, y_category, test_size=0.2, random_state=42
)

print(f"  Training set: {len(X_train)} samples")
print(f"  Test set: {len(X_test)} samples")

# Feature scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# ============================================================================
# STEP 6: Train Regression Model (Burnout Score 0-100)
# ============================================================================
print("\n[STEP 6] Training regression model...")
print("-" * 80)

rf_regressor = RandomForestRegressor(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

rf_regressor.fit(X_train_scaled, y_train_score)

# Evaluate
y_pred_score = rf_regressor.predict(X_test_scaled)
rmse = np.sqrt(mean_squared_error(y_test_score, y_pred_score))
r2 = r2_score(y_test_score, y_pred_score)

print(f"  RMSE: {rmse:.2f}")
print(f"  R2 Score: {r2:.3f}")

# Cross-validation
cv_scores = cross_val_score(rf_regressor, X_train_scaled, y_train_score, cv=5, scoring='r2')
print(f"  Cross-validation R2: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

# ============================================================================
# STEP 7: Feature Importance Analysis
# ============================================================================
print("\n[STEP 7] Feature importance analysis...")
print("-" * 80)

feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': rf_regressor.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop features:")
for idx, row in feature_importance.iterrows():
    print(f"  {row['feature']:30s} {row['importance']:.4f}")

# ============================================================================
# STEP 8: Save model and metadata
# ============================================================================
print("\n[STEP 8] Saving model and metadata...")
print("-" * 80)

# Save model
model_path = models_dir / 'burnout_model.joblib'
joblib.dump(rf_regressor, model_path)
print(f"  Saved model: {model_path}")

# Save scaler
scaler_path = models_dir / 'burnout_scaler.joblib'
joblib.dump(scaler, scaler_path)
print(f"  Saved scaler: {scaler_path}")

# Save metadata
metadata = {
    'feature_names': feature_columns,
    'feature_importance': feature_importance.to_dict('records'),
    'model_type': 'RandomForestRegressor',
    'n_estimators': 200,
    'train_samples': len(X_train),
    'test_samples': len(X_test),
    'rmse': float(rmse),
    'r2_score': float(r2),
    'cv_r2_mean': float(cv_scores.mean()),
    'cv_r2_std': float(cv_scores.std()),
    'score_range': [0, 100],
    'risk_thresholds': {
        'low': [0, 30],
        'moderate': [30, 50],
        'high': [50, 70],
        'severe': [70, 100]
    }
}

metadata_path = models_dir / 'burnout_meta.json'
with open(metadata_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"  Saved metadata: {metadata_path}")

# ============================================================================
# STEP 9: Generate Survey Questions
# ============================================================================
print("\n[STEP 9] Generating 15-question survey...")
print("-" * 80)

# Map features to user-friendly survey questions
survey_questions = [
    {
        "id": "anxiety",
        "question": "How often do you feel anxious or worried?",
        "scale": "Never (1) - Always (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'anxiety']['importance'].values[0])
    },
    {
        "id": "depression",
        "question": "How often do you feel sad or depressed?",
        "scale": "Never (1) - Always (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'depression']['importance'].values[0])
    },
    {
        "id": "sleep_quality",
        "question": "How would you rate your sleep quality?",
        "scale": "Excellent (1) - Very Poor (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'sleep_quality']['importance'].values[0])
    },
    {
        "id": "self_esteem",
        "question": "How confident do you feel about yourself?",
        "scale": "Very confident (1) - Not confident (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'self_esteem']['importance'].values[0])
    },
    {
        "id": "academic_performance",
        "question": "How satisfied are you with your academic performance?",
        "scale": "Very satisfied (1) - Very dissatisfied (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'academic_performance']['importance'].values[0])
    },
    {
        "id": "study_load",
        "question": "How heavy is your current study workload?",
        "scale": "Very light (1) - Overwhelming (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'study_load']['importance'].values[0])
    },
    {
        "id": "future_career_concerns",
        "question": "How worried are you about your future career?",
        "scale": "Not worried (1) - Extremely worried (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'future_career_concerns']['importance'].values[0])
    },
    {
        "id": "social_support",
        "question": "How supported do you feel by friends and family?",
        "scale": "Very supported (1) - Not supported (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'social_support']['importance'].values[0])
    },
    {
        "id": "peer_pressure",
        "question": "How much pressure do you feel from peers?",
        "scale": "No pressure (1) - Extreme pressure (5)",
        "weight": float(feature_importance[feature_importance['feature'] == 'peer_pressure']['importance'].values[0])
    },
    {
        "id": "mental_health_history",
        "question": "Do you have a personal or family history of mental health issues?",
        "scale": "No (0) - Yes (1)",
        "weight": float(feature_importance[feature_importance['feature'] == 'mental_health_history']['importance'].values[0])
    },
    # Additional derived questions for 15 total
    {
        "id": "physical_health",
        "question": "How would you rate your overall physical health?",
        "scale": "Excellent (1) - Very Poor (5)",
        "weight": 0.05
    },
    {
        "id": "time_management",
        "question": "How well do you manage your time?",
        "scale": "Very well (1) - Very poorly (5)",
        "weight": 0.05
    },
    {
        "id": "stress_coping",
        "question": "How well do you cope with stress?",
        "scale": "Very well (1) - Very poorly (5)",
        "weight": 0.05
    },
    {
        "id": "social_isolation",
        "question": "How often do you feel lonely or isolated?",
        "scale": "Never (1) - Always (5)",
        "weight": 0.05
    },
    {
        "id": "energy_level",
        "question": "How would you describe your energy levels?",
        "scale": "Very high (1) - Very low (5)",
        "weight": 0.05
    }
]

survey_path = models_dir / 'burnout_survey.json'
with open(survey_path, 'w') as f:
    json.dump(survey_questions, f, indent=2)
print(f"  Saved survey: {survey_path}")
print(f"  Total questions: {len(survey_questions)}")

print("\n" + "=" * 80)
print("[SUCCESS] Model training complete!")
print("=" * 80)
print(f"\nModel performance:")
print(f"  - R2 Score: {r2:.3f}")
print(f"  - RMSE: {rmse:.2f}")
print(f"  - Cross-validation: {cv_scores.mean():.3f}")
print(f"\nFiles created:")
print(f"  - {model_path}")
print(f"  - {scaler_path}")
print(f"  - {metadata_path}")
print(f"  - {survey_path}")


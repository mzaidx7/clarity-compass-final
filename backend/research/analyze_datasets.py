"""
Comprehensive analysis of all datasets for burnout prediction.
"""
import sys
import pandas as pd
import numpy as np
from pathlib import Path
import json

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

print("=" * 80)
print("COMPREHENSIVE DATASET ANALYSIS FOR BURNOUT PREDICTION")
print("=" * 80)

base_dir = Path(__file__).parent.parent / 'data'

# ============================================================================
# DATASET 1: Student Stress Monitoring (Kaggle)
# ============================================================================
print("\n[1] STUDENT STRESS MONITORING DATASET")
print("-" * 80)

stress_1 = pd.read_csv(base_dir / 'kaggle_raw' / 'stress_monitoring' / 'Stress_Dataset.csv')
stress_2 = pd.read_csv(base_dir / 'kaggle_raw' / 'stress_monitoring' / 'StressLevelDataset.csv')

print("\nStress_Dataset.csv:")
print(f"  Rows: {len(stress_1):,}")
print(f"  Columns: {len(stress_1.columns)}")
print(f"  Columns: {list(stress_1.columns)}")
print("\nFirst 3 rows:")
print(stress_1.head(3))
print("\nData types:")
print(stress_1.dtypes)
print("\nMissing values:")
print(stress_1.isnull().sum())
print("\nBasic statistics:")
print(stress_1.describe())

print("\n" + "-" * 40)
print("\nStressLevelDataset.csv:")
print(f"  Rows: {len(stress_2):,}")
print(f"  Columns: {len(stress_2.columns)}")
print(f"  Columns: {list(stress_2.columns)}")
print("\nFirst 3 rows:")
print(stress_2.head(3))
print("\nData types:")
print(stress_2.dtypes)
print("\nMissing values:")
print(stress_2.isnull().sum())

# ============================================================================
# DATASET 2: Mental Stress and Coping Mechanisms (Kaggle)
# ============================================================================
print("\n\n[2] MENTAL STRESS AND COPING MECHANISMS DATASET")
print("-" * 80)

mental_stress = pd.read_csv(base_dir / 'kaggle_raw' / 'mental_stress_coping' / 'Student_Mental_Stress_and_Coping_Mechanisms.csv')

print(f"  Rows: {len(mental_stress):,}")
print(f"  Columns: {len(mental_stress.columns)}")
print(f"  Columns: {list(mental_stress.columns)}")
print("\nFirst 3 rows:")
print(mental_stress.head(3))
print("\nData types:")
print(mental_stress.dtypes)
print("\nMissing values:")
print(mental_stress.isnull().sum())
print("\nBasic statistics:")
print(mental_stress.describe())

# ============================================================================
# DATASET 3: StudentLife (Already in project)
# ============================================================================
print("\n\n[3] STUDENTLIFE DATASET (DARTMOUTH)")
print("-" * 80)

# Load one stress file as example
studentlife_stress = base_dir / 'studentlife' / 'dataset' / 'EMA' / 'response' / 'Stress'
stress_files = list(studentlife_stress.glob('*.json'))
print(f"  Stress response files: {len(stress_files)} students")

# Sample one student
sample_file = stress_files[0]
with open(sample_file) as f:
    sample_stress = json.load(f)

print(f"\nSample stress data from {sample_file.name}:")
print(f"  Total responses: {len(sample_stress)}")
print(f"  Sample entries (first 3):")
for i, entry in enumerate(sample_stress[:3]):
    print(f"    {i+1}. {entry}")

# Load EMA definitions
ema_def_file = base_dir / 'studentlife' / 'dataset' / 'EMA' / 'EMA_definition.json'
with open(ema_def_file) as f:
    ema_defs = json.load(f)

print(f"\n  Available EMA surveys: {len(ema_defs)}")
for survey in ema_defs:
    print(f"    - {survey['name']} ({len(survey['questions'])} questions)")

# ============================================================================
# SUMMARY AND RECOMMENDATIONS
# ============================================================================
print("\n\n" + "=" * 80)
print("ANALYSIS SUMMARY")
print("=" * 80)

print("\n[Dataset Sizes]")
print(f"  Dataset 1 (Stress Monitoring):  {len(stress_1):,} + {len(stress_2):,} rows")
print(f"  Dataset 2 (Mental Stress Coping): {len(mental_stress):,} rows")
print(f"  Dataset 3 (StudentLife):          ~{len(stress_files)} students, longitudinal data")

print("\n[Key Observations]")
print("  1. Dataset 1 appears to have multiple stress-related features")
print("  2. Dataset 2 has mental stress and coping mechanism information")
print("  3. StudentLife has rich temporal data with multiple surveys")

print("\n[Next Steps]")
print("  1. Extract common features across all datasets")
print("  2. Create a unified feature set for burnout prediction")
print("  3. Train ensemble model with cross-dataset validation")
print("  4. Design 15-question survey based on feature importance")

print("\n" + "=" * 80)
print("[DONE] Analysis complete! Check output above for details.")
print("=" * 80)


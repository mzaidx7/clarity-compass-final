"""
Quick test script to verify the assessment system works end-to-end.
"""
import sys
from api.services.burnout_service import get_burnout_service

print("=" * 80)
print("ASSESSMENT SYSTEM TEST")
print("=" * 80)

# Test 1: Load service
print("\n[Test 1] Loading burnout service...")
try:
    service = get_burnout_service()
    print("  [OK] Service loaded successfully")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test 2: Get survey questions
print("\n[Test 2] Getting survey questions...")
try:
    questions = service.get_survey_questions()
    print(f"  [OK] Loaded {len(questions)} questions")
    print(f"  Sample question: {questions[0]['question']}")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test 3: Make prediction with sample responses
print("\n[Test 3] Testing prediction with sample responses...")
try:
    sample_responses = {
        'anxiety': 3,
        'depression': 2,
        'sleep_quality': 4,
        'self_esteem': 2,
        'academic_performance': 3,
        'study_load': 4,
        'future_career_concerns': 3,
        'social_support': 2,
        'peer_pressure': 3,
        'mental_health_history': 0,
    }
    
    result = service.predict(sample_responses)
    print(f"  [OK] Prediction successful!")
    print(f"  Burnout Score: {result['burnout_score']}/100")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Top Risk Factors:")
    for factor in result['top_risk_factors']:
        print(f"    - {factor['factor']}: {factor['risk_contribution']:.1f}%")
    print(f"  Using Model: {result['using_model']}")
    print(f"  Model Confidence (R2): {result['model_confidence']:.3f}")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test 4: Get model info
print("\n[Test 4] Getting model information...")
try:
    info = service.get_model_info()
    print(f"  [OK] Model info retrieved")
    print(f"  Model Type: {info['model_type']}")
    print(f"  R2 Score: {info['r2_score']}")
    print(f"  RMSE: {info['rmse']}")
    print(f"  Features: {info['features']}")
    print(f"  Training Samples: {info['train_samples']}")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

print("\n" + "=" * 80)
print("[SUCCESS] All tests passed!")
print("=" * 80)
print("\nThe burnout assessment system is ready to use.")
print("Run 'npm run dev:full' from the project root to start the full stack.")


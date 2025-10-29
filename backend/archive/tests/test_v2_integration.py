"""Test v2 model integration"""
import sys
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

from api.services.burnout_service import get_burnout_service

print("=" * 80)
print("V2 MODEL INTEGRATION TEST")
print("=" * 80)

try:
    service = get_burnout_service()
    questions = service.get_survey_questions()
    
    print(f"\n[OK] Service loaded successfully!")
    print(f"[OK] Questions: {len(questions)}")
    print(f"[OK] Accuracy: {service.metadata['r2_score']:.1%}")
    print(f"[OK] Model Type: {service.metadata.get('model_type', 'Unknown')}")
    print(f"[OK] Uses Polynomial: {service.metadata.get('uses_polynomial_features', False)}")
    
    # Test prediction
    print(f"\n[Testing prediction with all 19 features...]")
    test_responses = {q['id']: 3 for q in questions if q['id'] != 'mental_health_history'}
    test_responses['mental_health_history'] = 0
    
    result = service.predict(test_responses)
    print(f"[OK] Prediction: {result['burnout_score']}/100")
    print(f"[OK] Risk Level: {result['risk_level']}")
    print(f"[OK] Model Confidence: {result['model_confidence']:.3f}")
    
    print("\n" + "=" * 80)
    print("[SUCCESS] V2 model integrated and working!")
    print("=" * 80)
except Exception as e:
    print(f"\n[FAIL] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)


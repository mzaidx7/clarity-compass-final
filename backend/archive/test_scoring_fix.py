"""
Quick test to verify the scoring fix works correctly.
Tests that positive answers lead to LOW burnout scores.
"""
import sys
import codecs
# Handle Unicode on Windows
sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, 'api')

from api.services.burnout_service import get_burnout_service

def test_scoring():
    service = get_burnout_service()
    
    print("\n" + "="*60)
    print("TESTING BURNOUT SCORING FIX")
    print("="*60)
    
    # Test 1: All "best" possible answers
    print("\n[Test 1] All BEST answers (should be LOW burnout):")
    best_responses = {
        'anxiety': 1,  # Rarely/Never
        'self_esteem': 5,  # Very High (will be inverted to 1)
        'depression': 1,  # Rarely/Never
        'sleep_quality': 5,  # Excellent (will be inverted to 1)
        'academic_performance': 5,  # Very Satisfied (will be inverted to 1)
        'study_load': 1,  # Very Light
        'future_career_concerns': 1,  # Not Worried
        'social_support': 5,  # Very Supported (will be inverted to 1)
        'peer_pressure': 1,  # No Pressure
        'mental_health_history': 0,  # No
        'headache': 1,  # Rarely/Never
        'blood_pressure': 1,  # Never
        'breathing_problem': 1,  # Never
        'noise_level': 1,  # Not At All
        'living_conditions': 5,  # Very Satisfied (will be inverted to 1)
        'safety': 5,  # Very Safe (will be inverted to 1)
        'basic_needs': 5,  # Fully Met (will be inverted to 1)
        'bullying': 1,  # Never
        'extracurricular_activities': 5,  # Well Balanced (will be inverted to 1)
    }
    
    result = service.predict(best_responses)
    print(f"  Burnout Score: {result['burnout_score']}")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Expected: LOW (score ~5-10)")
    print(f"  ✅ PASS" if result['burnout_score'] < 15 else "  ❌ FAIL")
    
    # Test 2: All "worst" possible answers
    print("\n[Test 2] All WORST answers (should be HIGH burnout):")
    worst_responses = {
        'anxiety': 5,  # Always
        'self_esteem': 1,  # Very Low (will be inverted to 5)
        'depression': 5,  # Always
        'sleep_quality': 1,  # Very Poor (will be inverted to 5)
        'academic_performance': 1,  # Very Dissatisfied (will be inverted to 5)
        'study_load': 5,  # Overwhelming
        'future_career_concerns': 5,  # Extremely Worried
        'social_support': 1,  # Not Supported (will be inverted to 5)
        'peer_pressure': 5,  # Extreme Pressure
        'mental_health_history': 1,  # Yes
        'headache': 5,  # Very Frequently
        'blood_pressure': 5,  # Frequently
        'breathing_problem': 5,  # Frequently
        'noise_level': 5,  # Severely
        'living_conditions': 1,  # Very Dissatisfied (will be inverted to 5)
        'safety': 1,  # Very Unsafe (will be inverted to 5)
        'basic_needs': 1,  # Not Met At All (will be inverted to 5)
        'bullying': 5,  # Frequently
        'extracurricular_activities': 1,  # Very Imbalanced (will be inverted to 5)
    }
    
    result = service.predict(worst_responses)
    print(f"  Burnout Score: {result['burnout_score']}")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Expected: SEVERE (score ~90-95)")
    print(f"  ✅ PASS" if result['burnout_score'] > 85 else "  ❌ FAIL")
    
    # Test 3: All neutral/moderate answers
    print("\n[Test 3] All NEUTRAL answers (should be MODERATE burnout):")
    neutral_responses = {key: 3 for key in best_responses.keys()}
    neutral_responses['mental_health_history'] = 0
    
    result = service.predict(neutral_responses)
    print(f"  Burnout Score: {result['burnout_score']}")
    print(f"  Risk Level: {result['risk_level']}")
    print(f"  Expected: MODERATE (score 35-55)")
    print(f"  ✅ PASS" if 35 <= result['burnout_score'] <= 65 else "  ❌ FAIL")
    
    print("\n" + "="*60)
    print("SCORING FIX VERIFICATION COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_scoring()


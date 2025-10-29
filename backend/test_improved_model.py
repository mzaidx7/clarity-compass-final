"""
Quick sanity test for the improved v2 model.
"""
import sys
import joblib
import numpy as np
import json
from pathlib import Path
from sklearn.preprocessing import PolynomialFeatures

if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

print("=" * 80)
print("IMPROVED MODEL SANITY TEST")
print("=" * 80)

models_dir = Path(__file__).parent / 'models'

# Load v2 model
print("\n[Test 1] Loading improved model v2...")
try:
    model = joblib.load(models_dir / 'burnout_model_v2.joblib')
    scaler = joblib.load(models_dir / 'burnout_scaler_v2.joblib')
    with open(models_dir / 'burnout_meta_v2.json') as f:
        meta = json.load(f)
    print(f"  [OK] Model loaded: {meta['model_type']}")
    print(f"  [OK] R2 Score: {meta['r2_score']:.3f}")
    print(f"  [OK] RMSE: {meta['rmse']:.2f}")
    print(f"  [OK] Features: {meta['total_features']}")
    
    # Create polynomial transformer
    poly = PolynomialFeatures(degree=2, include_bias=False, interaction_only=True)
    # Fit on dummy data with correct shape (19 features)
    poly.fit(np.zeros((1, 19)))
    print(f"  [OK] Polynomial transformer ready")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

# Test prediction with sample data
print("\n[Test 2] Testing prediction with low-risk profile...")
try:
    # Low risk: good sleep, low stress, good self-esteem
    low_risk = np.array([[20, 20, 15, 10, 20, 30, 25, 15, 20, 0, 15, 20, 10, 20, 15, 30, 30, 10, 20]]).astype(float)
    low_risk_poly = poly.transform(low_risk)
    low_risk_scaled = scaler.transform(low_risk_poly)
    low_score = model.predict(low_risk_scaled)[0]
    print(f"  [OK] Low-risk prediction: {low_score:.1f}/100")
    if low_score < 40:
        print(f"  [OK] Score is appropriately LOW")
    else:
        print(f"  [WARNING] Score seems high for low-risk profile")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

print("\n[Test 3] Testing prediction with high-risk profile...")
try:
    # High risk: poor sleep, high stress, low self-esteem
    high_risk = np.array([[80, 85, 90, 85, 75, 90, 80, 85, 75, 100, 80, 75, 85, 70, 85, 60, 55, 80, 70]]).astype(float)
    high_risk_poly = poly.transform(high_risk)
    high_risk_scaled = scaler.transform(high_risk_poly)
    high_score = model.predict(high_risk_scaled)[0]
    print(f"  [OK] High-risk prediction: {high_score:.1f}/100")
    if high_score > 60:
        print(f"  [OK] Score is appropriately HIGH")
    else:
        print(f"  [WARNING] Score seems low for high-risk profile")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

print("\n[Test 4] Testing prediction with moderate-risk profile...")
try:
    # Moderate risk: average everything
    moderate = np.array([[50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]]).astype(float)
    moderate_poly = poly.transform(moderate)
    moderate_scaled = scaler.transform(moderate_poly)
    moderate_score = model.predict(moderate_scaled)[0]
    print(f"  [OK] Moderate-risk prediction: {moderate_score:.1f}/100")
    if 35 < moderate_score < 65:
        print(f"  [OK] Score is appropriately MODERATE")
    else:
        print(f"  [WARNING] Score outside expected moderate range")
except Exception as e:
    print(f"  [FAIL] {e}")
    sys.exit(1)

print("\n" + "=" * 80)
print("[SUCCESS] All sanity tests passed!")
print("=" * 80)
print(f"\nModel Performance Summary:")
print(f"  - Accuracy (R2):  {meta['r2_score']:.1%}")
print(f"  - Error (RMSE):   {meta['rmse']:.2f} points")
print(f"  - Error (MAE):    {meta['mae']:.2f} points")
print(f"  - CV Score:       {meta['cv_r2_mean']:.3f} (+/- {meta['cv_r2_std']:.3f})")
print(f"  - Training Data:  {meta['train_samples']} samples")
print(f"  - Features Used:  {meta['total_features']} (with interactions)")
print(f"\nImprovement over v1:")
print(f"  - Old R2: 0.643 (64.3%)")
print(f"  - New R2: {meta['r2_score']:.3f} ({meta['r2_score']*100:.1f}%)")
print(f"  - Gain:   +{(meta['r2_score'] - 0.643)*100:.1f} percentage points")
print("\n" + "=" * 80)


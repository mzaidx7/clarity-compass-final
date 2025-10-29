"""
Burnout Prediction Service

Uses the trained Random Forest model (v2) with polynomial features to predict burnout scores.
"""
import json
import joblib
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
from sklearn.preprocessing import PolynomialFeatures

class BurnoutService:
    """Service for burnout prediction using ML model with polynomial features."""
    
    def __init__(self):
        self.model_dir = Path(__file__).parent.parent.parent / 'models'
        self.model = None
        self.scaler = None
        self.metadata = None
        self.survey_questions = None
        self.poly = None
        self._load_model()
    
    def _load_model(self):
        """Load the trained model, scaler, and metadata."""
        try:
            # Try to load v2 model first (86% accuracy)
            model_path = self.model_dir / 'burnout_model_v2.joblib'
            meta_path = self.model_dir / 'burnout_meta_v2.json'
            scaler_path = self.model_dir / 'burnout_scaler_v2.joblib'
            
            # Check if v2 exists, otherwise fall back to v1
            if not model_path.exists():
                print("[BurnoutService] v2 model not found, using v1")
                model_path = self.model_dir / 'burnout_model.joblib'
                scaler_path = self.model_dir / 'burnout_scaler.joblib'
                meta_path = self.model_dir / 'burnout_meta.json'
            
            # Load model
            self.model = joblib.load(model_path)
            
            # Load scaler
            self.scaler = joblib.load(scaler_path)
            
            # Load metadata
            with open(meta_path) as f:
                self.metadata = json.load(f)
            
            # Set up polynomial features if v2
            if self.metadata.get('uses_polynomial_features', False):
                self.poly = PolynomialFeatures(
                    degree=self.metadata.get('polynomial_degree', 2),
                    include_bias=False,
                    interaction_only=True
                )
                # Fit on dummy data with correct number of base features
                n_features = len(self.metadata['feature_names'])
                self.poly.fit(np.zeros((1, n_features)))
                print(f"[BurnoutService] Using v2 model with polynomial features")
            else:
                print(f"[BurnoutService] Using v1 model (simple features)")
            
            # Load survey questions
            survey_path = self.model_dir / 'burnout_survey_v2.json'
            if not survey_path.exists():
                survey_path = self.model_dir / 'burnout_survey.json'
            
            with open(survey_path) as f:
                self.survey_questions = json.load(f)
            
            print(f"[BurnoutService] Loaded model with {len(self.metadata['feature_names'])} base features")
            print(f"[BurnoutService] Model R2 score: {self.metadata['r2_score']:.3f}")
            print(f"[BurnoutService] Model type: {self.metadata.get('model_type', 'Unknown')}")
            
        except Exception as e:
            print(f"[BurnoutService] Error loading model: {e}")
            raise
    
    def get_survey_questions(self) -> List[Dict]:
        """Return the survey questions."""
        return self.survey_questions
    
    def predict(self, responses: Dict[str, float]) -> Dict:
        """
        Predict burnout score from survey responses.
        
        Args:
            responses: Dict of {feature_id: value} where value is typically 1-5 or 0-1
        
        Returns:
            Dict with burnout_score, risk_level, top_risk_factors, etc.
        """
        # Prepare features in the correct order
        feature_values = []
        feature_names = self.metadata['feature_names']
        
        for feature_name in feature_names:
            if feature_name in responses:
                value = responses[feature_name]
                # Normalize to 0-100 scale (assuming input is 1-5 or 0-1)
                if feature_name == 'mental_health_history':
                    normalized = value * 100  # Binary 0/1 -> 0/100
                else:
                    # For 1-5 scale questions, convert to 0-100
                    normalized = ((value - 1) / 4) * 100
                feature_values.append(normalized)
            else:
                # Use median if feature not provided
                feature_values.append(50.0)  # Neutral value
        
        # Convert to numpy array and reshape
        X = np.array(feature_values).reshape(1, -1)
        
        # Apply polynomial features if using v2
        if self.poly is not None:
            X = self.poly.transform(X)
        
        # Scale features
        X_scaled = self.scaler.transform(X)
        
        # Predict
        burnout_score = float(self.model.predict(X_scaled)[0])
        burnout_score = np.clip(burnout_score, 0, 100)
        
        # Determine risk level
        risk_level = self._get_risk_level(burnout_score)
        
        # Calculate top risk factors
        top_factors = self._get_top_risk_factors(responses, feature_names)
        
        return {
            'burnout_score': round(burnout_score, 2),
            'risk_level': risk_level,
            'top_risk_factors': top_factors,
            'using_model': True,
            'model_confidence': self.metadata['r2_score']
        }
    
    def _get_risk_level(self, score: float) -> str:
        """Determine risk level from burnout score."""
        thresholds = self.metadata['risk_thresholds']
        if score < thresholds['moderate'][0]:
            return 'low'
        elif score < thresholds['high'][0]:
            return 'moderate'
        elif score < thresholds['severe'][0]:
            return 'high'
        else:
            return 'severe'
    
    def _get_top_risk_factors(self, responses: Dict[str, float], feature_names: List[str]) -> List[Dict]:
        """Identify the top 3 risk factors based on responses and feature importance."""
        # Get feature importance from metadata
        importance_map = {
            item['feature']: item['importance'] 
            for item in self.metadata['feature_importance']
        }
        
        # Calculate risk score for each feature (high value * high importance = high risk)
        risk_factors = []
        for feature_name in feature_names:
            if feature_name in responses:
                value = responses[feature_name]
                importance = importance_map.get(feature_name, 0)
                
                # Normalize value to 0-100 scale
                if feature_name == 'mental_health_history':
                    normalized_value = value * 100
                else:
                    normalized_value = ((value - 1) / 4) * 100
                
                # Risk contribution = value * importance
                risk_contribution = normalized_value * importance
                
                # Get human-readable name
                question_obj = next((q for q in self.survey_questions if q['id'] == feature_name), None)
                display_name = question_obj['question'].split('?')[0] if question_obj else feature_name
                
                risk_factors.append({
                    'factor': display_name,
                    'value': round(normalized_value, 2),
                    'importance': round(importance * 100, 2),
                    'risk_contribution': round(risk_contribution, 2)
                })
        
        # Sort by risk contribution and return top 3
        risk_factors.sort(key=lambda x: x['risk_contribution'], reverse=True)
        return risk_factors[:3]
    
    def get_model_info(self) -> Dict:
        """Return model metadata and performance info."""
        return {
            'model_type': self.metadata['model_type'],
            'features': len(self.metadata['feature_names']),
            'r2_score': round(self.metadata['r2_score'], 3),
            'rmse': round(self.metadata['rmse'], 2),
            'cv_score': round(self.metadata['cv_r2_mean'], 3),
            'train_samples': self.metadata['train_samples'],
            'test_samples': self.metadata['test_samples']
        }


# Global instance
_burnout_service = None

def get_burnout_service() -> BurnoutService:
    """Get or create the global burnout service instance."""
    global _burnout_service
    if _burnout_service is None:
        _burnout_service = BurnoutService()
    return _burnout_service


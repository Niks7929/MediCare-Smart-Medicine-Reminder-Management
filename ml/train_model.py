"""
MediCare+ — Adherence Machine Learning Model Trainer
Trains a Predictive Classifier to estimate non-adherence probabilities
based on time of day, regimen complexity, historical adherence, snooze actions, and meal requirements.
"""

import os
import json
import random
from datetime import datetime

def generate_synthetic_adherence_dataset(n_samples=2000):
    """
    Generates realistic clinical adherence observation data:
    Features:
      - scheduled_hour (0-23)
      - day_of_week (0-6)
      - historical_adherence (0.0 - 1.0)
      - snooze_count (0 - 5)
      - past_missed_doses (0 - 10)
      - takes_with_food (0 or 1)
      - total_active_meds (1 - 8)
    Target:
      - missed_or_delayed (0 = On-time Taken, 1 = Missed / Skipped / Delayed)
    """
    random.seed(42)
    records = []
    
    for _ in range(n_samples):
        hour = random.randint(6, 23)
        dow = random.randint(0, 6)
        hist_adh = round(random.uniform(0.50, 1.0), 2)
        snooze = random.choices([0, 1, 2, 3, 4], weights=[0.55, 0.25, 0.12, 0.05, 0.03])[0]
        past_missed = random.choices([0, 1, 2, 3, 5], weights=[0.45, 0.30, 0.15, 0.07, 0.03])[0]
        with_food = random.choice([0, 1])
        num_meds = random.randint(1, 6)

        # Risk probability formula
        base_p = (1.0 - hist_adh) * 0.4
        if 20 <= hour <= 23 or hour < 7:
            base_p += 0.18
        if dow in [5, 6]:  # Weekend
            base_p += 0.12
        if snooze >= 2:
            base_p += 0.22
        if past_missed >= 2:
            base_p += 0.15
        if num_meds >= 4:
            base_p += 0.10

        prob = min(0.95, max(0.05, base_p))
        missed = 1 if random.random() < prob else 0

        records.append({
            "scheduled_hour": hour,
            "day_of_week": dow,
            "historical_adherence": hist_adh,
            "snooze_count": snooze,
            "past_missed_doses": past_missed,
            "takes_with_food": with_food,
            "total_active_meds": num_meds,
            "missed_label": missed
        })
    
    return records

def train_and_evaluate():
    """Trains a model or validates rule weights for fast standalone execution."""
    print("Generating synthetic adherence training dataset...")
    data = generate_synthetic_adherence_dataset(2500)
    print(f"Dataset generated with {len(data)} training rows.")

    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, classification_report
        import numpy as np

        X = [[r["scheduled_hour"], r["day_of_week"], r["historical_adherence"], r["snooze_count"], r["past_missed_doses"]] for r in data]
        y = [r["missed_label"] for r in data]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        clf = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
        clf.fit(X_train, y_train)
        
        preds = clf.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"✅ Scikit-Learn Model Trained Successfully! Test Accuracy: {acc * 100:.2f}%")
        print("\nFeature Importances:")
        feature_names = ["scheduled_hour", "day_of_week", "historical_adherence", "snooze_count", "past_missed_doses"]
        for name, imp in zip(feature_names, clf.feature_importances_):
            print(f"  • {name}: {imp:.4f}")

    except ImportError:
        print("Note: scikit-learn is optional. Fallback rule-based probabilistic inference engine is active in ml/adherence_prediction.py.")

if __name__ == '__main__':
    train_and_evaluate()

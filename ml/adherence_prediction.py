"""
MediCare+ — Machine Learning Missed-Dose Risk Prediction Engine
Analyzes patient dose response history to predict likelihood of missing upcoming doses.
"""

import json
import sys
import math
from datetime import datetime

def calculate_missed_risk(input_data):
    """
    Inputs:
        - scheduled_hour (0-23)
        - day_of_week (0=Mon, 6=Sun)
        - historical_adherence_rate (0.0 to 1.0)
        - snooze_count (int)
        - medicine_form ('Tablet', 'Syrup', 'Injection', etc.)
        - past_missed_evening_count (int)
    Returns:
        - risk_score (0-100%)
        - risk_level ('Low', 'Moderate', 'High')
        - recommendations (list of strings)
    """
    scheduled_hour = input_data.get('scheduled_hour', 20)
    day_of_week = input_data.get('day_of_week', 5) # Default Sat
    historical_adherence = input_data.get('historical_adherence', 0.85)
    snooze_count = input_data.get('snooze_count', 0)
    past_missed_doses = input_data.get('past_missed_doses', 2)

    # Base risk derived from inverse adherence
    base_risk = (1.0 - historical_adherence) * 50.0

    # Evening/Night doses (19:00 - 23:00) historically have higher miss rates due to fatigue/social activities
    time_factor = 0.0
    if 19 <= scheduled_hour <= 23:
        time_factor = 18.0
    elif 0 <= scheduled_hour < 6:
        time_factor = 25.0
    elif 12 <= scheduled_hour <= 14:
        time_factor = 10.0

    # Weekend factor (Fri evening - Sun) routines change
    weekend_factor = 12.0 if day_of_week in [4, 5, 6] else 0.0

    # Repeated snooze behavior indicates friction or distraction
    snooze_factor = min(snooze_count * 8.0, 30.0)

    # Frequency factor
    missed_history_factor = min(past_missed_doses * 5.0, 20.0)

    # Total predicted risk percentage
    raw_risk = base_risk + time_factor + weekend_factor + snooze_factor + missed_history_factor
    risk_score = round(max(5.0, min(95.0, raw_risk)), 1)

    if risk_score < 30:
        risk_level = "Low Risk"
        status_color = "emerald"
    elif risk_score < 65:
        risk_level = "Moderate Risk"
        status_color = "amber"
    else:
        risk_level = "High Risk"
        status_color = "rose"

    recommendations = []
    if time_factor > 15:
        recommendations.append("Evening dose detected: Set a pre-bedtime calendar alert or pair with your dinner routine.")
    if weekend_factor > 0:
        recommendations.append("Weekend routine shift: Enable secondary caregiver notification for Saturday/Sunday doses.")
    if snooze_factor > 10:
        recommendations.append("High snooze count recorded: Consider adjusting dose window by 30 minutes with your doctor's approval.")
    if risk_score >= 65:
        recommendations.append("⚠️ High Missed-Dose Probability: Activate Smart Sound Alert and inform Caregiver.")

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "status_color": status_color,
        "recommendations": recommendations,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == '__main__':
    # Can run as CLI script receiving JSON input
    if len(sys.argv) > 1:
        try:
            input_json = json.loads(sys.argv[1])
            result = calculate_missed_risk(input_json)
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
    else:
        # Default test run
        sample = {
            "scheduled_hour": 20,
            "day_of_week": 5,
            "historical_adherence": 0.78,
            "snooze_count": 2,
            "past_missed_doses": 3
        }
        print(json.dumps(calculate_missed_risk(sample), indent=2))

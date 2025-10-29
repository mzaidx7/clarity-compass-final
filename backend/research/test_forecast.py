from forecast import forecast_next7

last14 = [45,47,46,48,50,49,51,52,53,54,56,55,57,58]
deadlines = [0,1,0,2,1,0,0]

pred, conf, drivers = forecast_next7(last14, deadlines7=deadlines, alpha=0.5, deadline_weight=1.5)

print("Forecast 7-day:", pred)
print("   Conf intervals:", conf)
print("   Drivers:", drivers)

# Run: python research/test_forecast.py

from confluent_kafka import Producer
import json
import time
import requests

producer = Producer({'bootstrap.servers': 'kafka:9092,kafka2:9093'})

# You can set any city here 
CITY = "Santa Clara"
API_URL = f"https://wttr.in/{CITY}?format=j1"

def get_weather_data():
    try:
        response = requests.get(API_URL)
        response.raise_for_status()
        data = response.json()

        # Extract from wttr.in response
        weather_data = {
            "temperature": data['current_condition'][0]['temp_C'],  # Celsius
            "humidity": data['current_condition'][0]['humidity'],   # Percentage
            "description": data['current_condition'][0]['weatherDesc'][0]['value'],
            "timestamp": time.time()
        }
        return weather_data
    except requests.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return None

def publish_weather():
    weather = get_weather_data()
    if weather:
        desc = weather["description"].lower()
        severe = any(x in desc for x in ["storm", "thunder", "hail", "rain", "snow", "sleet", "mist", "fog",  "overcast", "heavy", "blizzard", "wind", "ice"])
        weather["priority"] = 0 if severe else 2
        producer.produce("weather", json.dumps(weather).encode('utf-8'))
        producer.flush()
    else:
        print("Skipping publish due to fetch error.")

if __name__ == "__main__":
    while True:
        publish_weather()
        time.sleep(10)

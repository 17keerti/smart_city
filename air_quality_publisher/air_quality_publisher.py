from confluent_kafka import Producer
import json
import time
import requests

# Kafka setup
producer = Producer({'bootstrap.servers': 'kafka:9092'})

# Location (Santa Clara, CA)
LAT, LON = 37.3541, -121.9552
AIR_QUALITY_URL = (
    f"https://air-quality-api.open-meteo.com/v1/air-quality?"
    f"latitude={LAT}&longitude={LON}&hourly=pm10,carbon_monoxide,ozone"
)

def get_air_quality_data():
    try:
        response = requests.get(AIR_QUALITY_URL)
        response.raise_for_status()
        data = response.json()
        latest_index = -1  # Get the latest reading
        air_data = {
            "timestamp": time.time(),
            "pm10": data['hourly']['pm10'][latest_index],
            "ozone": data['hourly']['ozone'][latest_index],
            "carbon_monoxide": data['hourly']['carbon_monoxide'][latest_index]
        }
        return air_data
    except requests.RequestException as e:
        print(f"Error fetching air quality data: {e}")
        return None

def publish_air_quality():
    air_quality = get_air_quality_data()
    if air_quality:
        pm10 = air_quality.get("pm10")
        if pm10 is not None:
            air_quality["priority"] = 0 if pm10 > 100 else 2  # Basic threshold
        else:
            air_quality["priority"] = 2

        producer.produce("air_quality", json.dumps(air_quality).encode('utf-8'))
        producer.flush()
    else:
        print("Skipped publishing due to fetch error.")

if __name__ == "__main__":
    while True:
        publish_air_quality()
        time.sleep(10)

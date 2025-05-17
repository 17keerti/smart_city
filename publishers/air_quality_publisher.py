from confluent_kafka import Producer
import json, time

producer = Producer({'bootstrap.servers': 'localhost:9092'})

def publish_air_quality():
    data = {
        "pm25": 32,
        "pm10": 48,
        "timestamp": time.time()
    }
    producer.produce("air_quality", json.dumps(data))
    producer.flush()

if __name__ == "__main__":
    while True:
        publish_air_quality()
        time.sleep(5)

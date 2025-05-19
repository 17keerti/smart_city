from confluent_kafka import Producer
import json, time

producer = Producer({'bootstrap.servers': 'kafka:9092'})

def publish_weather():
    data = {
        "temperature": 28,
        "humidity": 60,
        "timestamp": time.time()
    }
    producer.produce("weather", json.dumps(data).encode('utf-8'))
    producer.flush()

if __name__ == "__main__":
    while True:
        publish_weather()
        time.sleep(10)

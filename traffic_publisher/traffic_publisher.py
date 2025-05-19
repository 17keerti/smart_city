from confluent_kafka import Producer
import json, time, random

producer = Producer({'bootstrap.servers': 'kafka:9092'})

def publish_traffic_data():
    data = {
        "intersection": f"I-{random.randint(1, 5)}",
        "congestion_level": random.choice(["low", "medium", "high"]),
        "timestamp": time.time()
    }
    producer.produce("traffic", json.dumps(data).encode('utf-8'))
    producer.flush()
    
if __name__ == "__main__":
    while True:
        publish_traffic_data()
        time.sleep(15) 
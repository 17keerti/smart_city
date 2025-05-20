from confluent_kafka import Producer
import json, time, random

producer = Producer({'bootstrap.servers': 'kafka:9092,kafka2:9093'})

def publish_traffic_data():
    congestion = random.choice(["low", "medium", "high"])
    
    priority = {
        "low": 2,
        "medium": 1,
        "high": 0  # 0 = highest priority
    }[congestion]

    data = {
        "intersection": f"I-{random.randint(1, 5)}",
        "congestion_level": congestion,   # Use the same congestion for priority and data
        "priority": priority,             # Add priority field here!
        "timestamp": time.time()
    }
    producer.produce("traffic", json.dumps(data).encode('utf-8'))
    producer.flush()
    
if __name__ == "__main__":
    while True:
        publish_traffic_data()
        time.sleep(15)

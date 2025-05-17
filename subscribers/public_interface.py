from kafka import KafkaConsumer
import json

# Topics this component is interested in
TOPICS = ['air_quality', 'weather']

# Create Kafka consumer
consumer = KafkaConsumer(
    *TOPICS,
    bootstrap_servers='localhost:9092',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',
    enable_auto_commit=True,
    group_id='public-interface-group'
)

print("📡 Public Interface is running...")

try:
    for message in consumer:
        topic = message.topic
        data = message.value
        print(f"[{topic.upper()}] Received: {data}")

except KeyboardInterrupt:
    print("\nPublic Interface stopped.")
finally:
    consumer.close()

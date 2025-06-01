from confluent_kafka import Consumer, KafkaError
import json
import heapq

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092,kafka2:9093',
    'group.id': 'traffic_manager',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe(['traffic'])

print("🚦 Traffic Management System is running...")

priority_queue = []

# Allowed publishers
ALLOWED_PUBLISHERS = ["traffic_sensor_3"]

try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print("Consumer error: {}".format(msg.error()))
            continue

        data = json.loads(msg.value().decode('utf-8'))
        topic = msg.topic() # Get the topic
        publisher_id = data.get("publisher_id")

        # Authentication
        if publisher_id not in ALLOWED_PUBLISHERS:
            print(f"⚠️  Unauthorized message from publisher: {publisher_id}. Discarding.")
            continue

        priority = data.get("priority", 2)  # Default to low priority if missing
        heapq.heappush(priority_queue, (priority, topic, data))

        while priority_queue:
            prio, topic, data = heapq.heappop(priority_queue)
            print(f"🚦 [Priority {prio}] Received from {topic}: {data}")

except KeyboardInterrupt:
    pass
finally:
    consumer.close()
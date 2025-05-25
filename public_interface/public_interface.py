from confluent_kafka import Consumer, KafkaError
import json
import heapq
import time

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092,kafka2:9093',
    'group.id': 'public_interface_group',
    'auto.offset.reset': 'earliest'
})

time.sleep(5)
consumer.subscribe(['weather', 'traffic', 'air_quality'])

print("📡 Public Interface is running with priority queue...")

priority_queue = []

# Allowed publishers
ALLOWED_PUBLISHERS = ["weather_sensor_2", "traffic_sensor_3", "air_quality_sensor_1"]

try:
    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print("Consumer error: {}".format(msg.error()))
            continue

        data = json.loads(msg.value().decode('utf-8'))
        topic = msg.topic()
        publisher_id = data.get("publisher_id")

        # Authentication
        if publisher_id not in ALLOWED_PUBLISHERS:
            print(f"⚠️  Unauthorized message from publisher: {publisher_id}. Discarding.")
            continue

        priority = data.get("priority", 2)  # Default priority = 2 (low)

        # Push into priority queue
        heapq.heappush(priority_queue, (priority, topic, data, msg.partition(), msg.offset()))

        # Drain and process messages
        while priority_queue:
            prio, topic, data, part, offset = heapq.heappop(priority_queue)
            print(f"🚨 [Priority {prio}] Received from {topic}: {data}")

except KeyboardInterrupt:
    pass
finally:
    consumer.close()

from confluent_kafka import Consumer, KafkaError
import json
import heapq

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'public_interface_group',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe(['weather', 'traffic', 'air_quality'])

print("📡 Public Interface is running with priority queue...")

priority_queue = []

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
        priority = data.get("priority", 2)  # Default priority = 2 (low)

        # Push into priority queue
        heapq.heappush(priority_queue, (priority, topic, data, msg.partition(), msg.offset()))

        # Drain and process messages (you can also limit how many per loop)
        while priority_queue:
            prio, topic, data, part, offset = heapq.heappop(priority_queue)
            print(f"🚨 [Priority {prio}] Received from {topic}: {data} | partition: {part} | offset: {offset}")

except KeyboardInterrupt:
    pass
finally:
    consumer.close()

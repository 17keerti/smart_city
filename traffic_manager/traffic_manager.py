from confluent_kafka import Consumer, KafkaError
import json

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'traffic_manager',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe(['traffic'])

print("🚦 Traffic Management System is running...")

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
        print(f"Received from {topic}: {data}") # Print topic name

except KeyboardInterrupt:
    pass
finally:
    consumer.close()

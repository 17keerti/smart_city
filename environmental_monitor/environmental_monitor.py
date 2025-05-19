from confluent_kafka import Consumer
import json

consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'env_monitor',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe(['air_quality', 'weather'])

print("Environmental Monitoring System is running...")

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
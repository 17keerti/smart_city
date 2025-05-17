from confluent_kafka import Consumer, KafkaError
import json

consumer = Consumer({
    'bootstrap.servers': 'localhost:9092',
    'group.id': 'traffic_manager',
    'auto.offset.reset': 'earliest'
})

consumer.subscribe(['traffic', 'weather'])

print("🚦 Traffic Management System is running...")

def adjust_traffic_signals(traffic_data, weather_data):
    decision = "Normal Timing"
    if traffic_data['congestion_level'] == "high":
        decision = "Extend Green Time"
    if weather_data and weather_data.get('temperature', 25) > 35:
        decision += " + Heat Response"
    
    print(f"[{traffic_data['intersection']}] Congestion: {traffic_data['congestion_level']} → Action: {decision}")

weather_data_cache = None

try:
    while True:
        msg = consumer.poll(1.0)

        if msg is None:
            continue
        if msg.error():
            if msg.error().code() != KafkaError._PARTITION_EOF:
                print(f"Consumer error: {msg.error()}")
            continue

        data = json.loads(msg.value())
        topic = msg.topic()

        if topic == 'traffic':
            adjust_traffic_signals(data, weather_data_cache)
        elif topic == 'weather':
            weather_data_cache = data

except KeyboardInterrupt:
    pass
finally:
    consumer.close()

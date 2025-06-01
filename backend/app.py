import sys
import json
import threading
import time
from flask import Flask, jsonify, request  # Import request here
from flask_cors import CORS  # type: ignore
from flask_socketio import SocketIO, emit, join_room, leave_room
from confluent_kafka import Consumer, KafkaError

app = Flask(__name__)
# Enable CORS for all origins, crucial for frontend development
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO. `cors_allowed_origins="*"` is important for development.
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Global State for Managing Subscriptions ---
active_client_subscriptions = {}

# List of all available Kafka topics that clients can subscribe to
AVAILABLE_TOPICS = ['air_quality', 'weather', 'traffic']

# Allowed publishers
ALLOWED_PUBLISHERS = ["weather_sensor_2", "traffic_sensor_3", "air_quality_sensor_1"]

# --- Kafka Consumer Thread ---

def kafka_consumer_thread():
    consumer_conf = {
        'bootstrap.servers': 'kafka:9092',
        'group.id': 'dashboard_websocket_consumer_group',
        'auto.offset.reset': 'earliest'
    }

    consumer = Consumer(consumer_conf)
    consumer.subscribe(AVAILABLE_TOPICS)

    print("Flask Backend: Starting Kafka consumer for all dashboard topics...")

    try:
        while True:
            msg = consumer.poll(1.0)

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    pass  # End of partition event
                elif msg.error():
                    sys.stderr.write('%% Consumer error: %s: %s\n' %
                                     (msg.error().code(), msg.error().str()))
                continue

            try:
                data = json.loads(msg.value().decode('utf-8'))
                topic = msg.topic()

                # Authentication check
                publisher_id = data.get("publisher_id")
                if publisher_id not in ALLOWED_PUBLISHERS:
                    print(f"⚠️  Unauthorized message from publisher: {publisher_id}. Discarding in backend.")
                    continue

                if topic in AVAILABLE_TOPICS:
                    payload = {'topic': topic, 'data': data}
                    print(f"Emitting to room: '{topic}'")
                    socketio.emit('new_data', payload, room=topic)
                    print(f"Flask Backend: Dispatched new data for topic '{topic}' to subscribed clients.")

            except json.JSONDecodeError as e:
                print(f"Flask Backend: Error decoding JSON from Kafka message: {e}")
            except Exception as e:
                print(f"Flask Backend: An unexpected error occurred in Kafka consumer: {e}")

    except KeyboardInterrupt:
        print("Flask Backend: Kafka consumer interrupted.")
    finally:
        consumer.close()
        print("Flask Backend: Kafka consumer closed.")

# --- Socket.IO Event Handlers ---

@socketio.on('connect')
def handle_connect():
    """
    Handles new client connections.
    Initializes their subscription set and sends available topics.
    """
    client_sid = request.sid
    active_client_subscriptions[client_sid] = set()
    print(f"Client connected: {client_sid}. Total clients: {len(active_client_subscriptions)}")
    # Emit the list of available topics to the newly connected client
    emit('available_topics', AVAILABLE_TOPICS)

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handles client disconnections.
    Removes their subscription entry.
    """
    client_sid = request.sid
    if client_sid in active_client_subscriptions:
        del active_client_subscriptions[client_sid]
    print(f"Client disconnected: {client_sid}. Total clients: {len(active_client_subscriptions)}")

@socketio.on('subscribe_topic')
def handle_subscribe_topic(topic_name):
    """
    Handles a client's request to subscribe to a topic.
    Adds the topic to the client's subscription set and makes them join the Socket.IO room.
    """
    client_sid = request.sid
    if topic_name in AVAILABLE_TOPICS:
        active_client_subscriptions[client_sid].add(topic_name)
        print(f"Client {client_sid} rooms before join: {socketio.server.rooms(client_sid)}")
        join_room(topic_name)
        print(f"Client {client_sid} subscribed to topic: {topic_name}. Current subscriptions: {active_client_subscriptions[client_sid]}")
        emit('subscription_status', {'topic': topic_name, 'status': 'subscribed'})
    else:
        emit('subscription_status', {'topic': topic_name, 'status': 'failed', 'message': 'Topic not found'})

@socketio.on('unsubscribe_topic')
def handle_unsubscribe_topic(topic_name):
    """
    Handles a client's request to unsubscribe from a topic.
    Removes the topic from the client's subscription set and makes them leave the Socket.IO room.
    """
    client_sid = request.sid
    if topic_name in AVAILABLE_TOPICS and topic_name in active_client_subscriptions[client_sid]:
        active_client_subscriptions[client_sid].remove(topic_name)
        leave_room(topic_name)
        print(f"Client {client_sid} unsubscribed from topic: {topic_name}. Current subscriptions: {active_client_subscriptions[client_sid]}")
        emit('subscription_status', {'topic': topic_name, 'status': 'unsubscribed'})
    else:
        emit('subscription_status', {'topic': topic_name, 'status': 'failed', 'message': 'Not subscribed to this topic or topic not found'})

# --- Flask HTTP Route ---

@app.route('/')
def index():
    return "Flask Socket.IO Backend is running!"

# --- Main Execution ---

if __name__ == '__main__':
    consumer_thread = threading.Thread(target=kafka_consumer_thread)
    consumer_thread.daemon = True
    consumer_thread.start()

    socketio.run(app, host='0.0.0.0', port=5001, debug=True, allow_unsafe_werkzeug=True)



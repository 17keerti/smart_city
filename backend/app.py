import sys
import json
import threading
import time
from flask import Flask, jsonify, request # Import request here
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from confluent_kafka import Consumer, KafkaError

app = Flask(__name__)
# Enable CORS for all origins, crucial for frontend development
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO. `cors_allowed_origins="*"` is important for development.
# `message_queue` can be used for scaling with multiple SocketIO instances (e.g., Redis)
# For a single instance, it's not strictly necessary but good practice.
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Global State for Managing Subscriptions ---
# This dictionary will map Socket.IO session IDs (sids) to a set of topics
# that each client is currently subscribed to.
# Example: { 'some_sid_123': {'air_quality', 'weather'}, 'another_sid_456': {'traffic'} }
active_client_subscriptions = {}

# List of all available Kafka topics that clients can subscribe to
AVAILABLE_TOPICS = ['air_quality', 'weather', 'traffic']

# --- Kafka Consumer Thread ---
# This thread will continuously consume messages from all AVAILABLE_TOPICS
# and then dispatch them to the relevant Socket.IO clients.

def kafka_consumer_thread():
    """
    Kafka consumer function to run in a separate thread.
    It subscribes to all AVAILABLE_TOPICS and pushes messages
    to connected Socket.IO clients based on their subscriptions.
    """
    consumer_conf = {
        'bootstrap.servers': 'kafka:9092,kafka2:9093',
        'group.id': 'dashboard_websocket_consumer_group', # Unique consumer group ID
        'auto.offset.reset': 'earliest' # Start consuming from the beginning of the topic
    }

    consumer = Consumer(consumer_conf)
    consumer.subscribe(AVAILABLE_TOPICS) # Subscribe to all topics we want to expose

    print("Flask Backend: Starting Kafka consumer for all dashboard topics...")

    try:
        while True:
            # Poll for messages with a timeout
            msg = consumer.poll(1.0)

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    # End of partition event - not an error
                    pass
                elif msg.error():
                    # Other Kafka errors
                    sys.stderr.write('%% Consumer error: %s: %s\n' %
                                     (msg.error().code(), msg.error().str()))
                continue

            # Decode the message value (which is JSON)
            try:
                data = json.loads(msg.value().decode('utf-8'))
                topic = msg.topic()

                # Dispatch the message to all clients subscribed to this topic
                if topic in AVAILABLE_TOPICS:
                    payload = {'topic': topic, 'data': data}
                    socketio.emit('new_data', payload, room=topic)
                    # print(f"Flask Backend: Dispatched new data for topic '{topic}' to subscribed clients.") # Uncomment for more verbose logging

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
    # Access request.sid from the imported `request` object
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
    # Access request.sid from the imported `request` object
    client_sid = request.sid
    if client_sid in active_client_subscriptions:
        # Remove the client's subscription entry
        del active_client_subscriptions[client_sid]
    print(f"Client disconnected: {client_sid}. Total clients: {len(active_client_subscriptions)}")

@socketio.on('subscribe_topic')
def handle_subscribe_topic(topic_name):
    """
    Handles a client's request to subscribe to a topic.
    Adds the topic to the client's subscription set and makes them join the Socket.IO room.
    """
    client_sid = request.sid # Access request.sid
    if topic_name in AVAILABLE_TOPICS:
        active_client_subscriptions[client_sid].add(topic_name)
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
    client_sid = request.sid # Access request.sid
    if topic_name in AVAILABLE_TOPICS and topic_name in active_client_subscriptions[client_sid]:
        active_client_subscriptions[client_sid].remove(topic_name)
        leave_room(topic_name)
        print(f"Client {client_sid} unsubscribed from topic: {topic_name}. Current subscriptions: {active_client_subscriptions[client_sid]}")
        emit('subscription_status', {'topic': topic_name, 'status': 'unsubscribed'})
    else:
        emit('subscription_status', {'topic': topic_name, 'status': 'failed', 'message': 'Not subscribed to this topic or topic not found'})

# --- Flask HTTP Route (for initial check or if needed, but not for data stream) ---
@app.route('/')
def index():
    return "Flask Socket.IO Backend is running!"

# --- Main Execution ---
if __name__ == '__main__':
    # Start the Kafka consumer in a separate thread
    consumer_thread = threading.Thread(target=kafka_consumer_thread)
    consumer_thread.daemon = True # Daemonize thread so it exits when main program exits
    consumer_thread.start()

    # Run the Flask app with Socket.IO
    # Use `debug=True` for development, but set to `False` in production
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, allow_unsafe_werkzeug=True)

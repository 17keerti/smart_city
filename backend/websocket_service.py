import sys
import json
import threading
import time
from flask import request 
from flask_cors import CORS 
from flask_socketio import SocketIO, emit, join_room, leave_room
from confluent_kafka import Consumer, KafkaError

# Initialize SocketIO. This instance will be used by the Flask app.
# `cors_allowed_origins="*"` is important for development.
# For a single instance, `message_queue` is not strictly necessary but good practice for scaling.
socketio = SocketIO(cors_allowed_origins="*")
socketio = SocketIO(app, cors_allowed_origins="*")


# --- Global State for Managing Subscriptions ---
# This dictionary will map Socket.IO session IDs (sids) to a set of topics
# that each client is currently subscribed to.
# Example: { 'some_sid_123': {'air_quality', 'weather'}, 'another_sid_456': {'traffic'} }
active_client_subscriptions = {}

# List of all available Kafka topics that clients can subscribe to
AVAILABLE_TOPICS = ['air_quality', 'weather', 'traffic']

# Allowed publishers (for basic authentication/authorization)
ALLOWED_PUBLISHERS = ["weather_sensor_2", "traffic_sensor_3", "air_quality_sensor_1"]

# Kafka Consumer instance (initialized once)
kafka_consumer = None

def initialize_kafka_consumer():
    """
    Initializes the Kafka consumer. Designed to be called once.
    """
    global kafka_consumer
    if kafka_consumer is None:
        consumer_conf = {
            'bootstrap.servers': 'kafka:9092,kafka2:9093',
            'group.id': 'dashboard_websocket_consumer_group', # Unique consumer group ID
            'auto.offset.reset': 'earliest' # Start consuming from the beginning of the topic
        }
        kafka_consumer = Consumer(consumer_conf)
        kafka_consumer.subscribe(AVAILABLE_TOPICS)
        print("Flask Backend: Kafka consumer initialized and subscribed to all topics.")

# --- Kafka Consumer Thread Function ---
def kafka_consumer_thread():
    """
    Kafka consumer function to run in a separate thread.
    It continuously consumes messages from all AVAILABLE_TOPICS
    and then dispatches them to the relevant Socket.IO clients.
    """
    initialize_kafka_consumer() # Ensure consumer is initialized

    print("Flask Backend: Starting Kafka consumer thread...")

    try:
        while True:
            # Poll for messages with a timeout
            msg = kafka_consumer.poll(1.0)

            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    # End of partition event - not an error, just no more messages for now
                    pass
                else:
                    # Other Kafka errors
                    sys.stderr.write('%% Kafka consumer error: %s: %s\n' %
                                     (msg.error().code(), msg.error().str()))
                continue

            # Decode the message value (which is JSON)
            try:
                data = json.loads(msg.value().decode('utf-8'))
                topic = msg.topic()

                # # --- START DEBUGGING LOGS FOR WEATHER ---
                # if topic == 'weather':
                #     print(f"DEBUG: Backend received WEATHER data from Kafka: {data}")
                #     print(f"DEBUG: Publisher ID for weather: {data.get('publisher_id')}")
                # # --- END DEBUGGING LOGS FOR WEATHER ---

                # Authentication check: Ensure message is from an allowed publisher
                publisher_id = data.get("publisher_id")
                if publisher_id not in ALLOWED_PUBLISHERS:
                    print(f"⚠️  Unauthorized message from publisher: {publisher_id} for topic {topic}. Discarding.")
                    continue

                # Dispatch the message to all clients subscribed to this topic's room
                if topic in AVAILABLE_TOPICS:
                    payload = {'topic': topic, 'data': data}
                    # Emit to a specific room (topic name) so only subscribed clients receive it
                    socketio.emit('new_data', payload, room=topic)
                    # # --- START DEBUGGING LOGS FOR WEATHER ---
                    # if topic == 'weather':
                    #     print(f"DEBUG: Backend emitted WEATHER data to Socket.IO room '{topic}': {payload}")
                    # # --- END DEBUGGING LOGS FOR WEATHER ---
                else:
                    print(f"DEBUG: Backend received data for unknown or unavailable topic: {topic}")


            except json.JSONDecodeError as e:
                print(f"Flask Backend: Error decoding JSON from Kafka message: {e}")
            except Exception as e:
                print(f"Flask Backend: An unexpected error occurred in Kafka consumer thread: {e}")

    except KeyboardInterrupt:
        print("Flask Backend: Kafka consumer thread interrupted.")
    finally:
        if kafka_consumer:
            kafka_consumer.close()
            print("Flask Backend: Kafka consumer closed.")

# --- Socket.IO Event Handlers ---
# These handlers are bound to the `socketio` instance.

@socketio.on('connect')
def handle_connect():
    """
    Handles new client connections.
    Initializes their subscription set and sends available topics.
    `request.sid` is directly available in the context of Socket.IO event handlers.
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
        # Remove the client's subscription entry
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
        join_room(topic_name) # Add client to a Socket.IO room named after the topic
        print(f"Client {client_sid} subscribed to topic: {topic_name}. Current subscriptions: {active_client_subscriptions[client_sid]}")
        emit('subscription_status', {'topic': topic_name, 'status': 'subscribed'})
    else:
        emit('subscription_status', {'topic': topic_name, 'status': 'failed', 'message': 'Topic not found'})
        print(f"Client {client_sid} attempted to subscribe to unknown topic: {topic_name}")

@socketio.on('unsubscribe_topic')
def handle_unsubscribe_topic(topic_name):
    """
    Handles a client's request to unsubscribe from a topic.
    Removes the topic from the client's subscription set and makes them leave the Socket.IO room.
    """
    client_sid = request.sid
    if client_sid in active_client_subscriptions and topic_name in active_client_subscriptions[client_sid]:
        active_client_subscriptions[client_sid].remove(topic_name)
        leave_room(topic_name) # Remove client from the Socket.IO room
        print(f"Client {client_sid} unsubscribed from topic: {topic_name}. Current subscriptions: {active_client_subscriptions[client_sid]}")
        emit('subscription_status', {'topic': topic_name, 'status': 'unsubscribed'})
    else:
        emit('subscription_status', {'topic': topic_name, 'status': 'failed', 'message': 'Not subscribed to this topic or topic not found'})
        print(f"Client {client_sid} attempted to unsubscribe from non-existent subscription or topic: {topic_name}")

# Function to start the Kafka consumer thread externally
def start_kafka_consumer_thread():
    """
    Starts the Kafka consumer in a separate daemon thread.
    """
    consumer_thread = threading.Thread(target=kafka_consumer_thread)
    consumer_thread.daemon = True # Daemonize thread so it exits when main program exits
    consumer_thread.start()
    print("Flask Backend: Kafka consumer thread started.")

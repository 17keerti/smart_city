#!/bin/bash

# Start Kafka and Zookeeper containers in detached mode
echo "Starting Kafka and Zookeeper with docker-compose..."
docker-compose up -d

# Wait a bit to make sure Kafka is ready
echo "Waiting 10 seconds for Kafka to start..."
sleep 10

# Array of commands to run in new Terminal windows
commands=(
  "python3 publishers/air_quality_publisher.py"
  "python3 publishers/weather_publisher.py"
  "python3 publishers/traffic_publisher.py"
  "python3 subscribers/environmental_monitor.py"
  "python3 subscribers/traffic_manager.py"
  "python3 subscribers/public_interface.py"
)


# Launch each command in a new Terminal window
for cmd in "${commands[@]}"; do
  echo "Launching: $cmd"
  osascript -e "tell application \"Terminal\" to do script \"cd $(pwd); $cmd\""
  sleep 1
done

echo "All components launched."

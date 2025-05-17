#!/bin/bash

commands=(
  "python3 publishers/air_quality_publisher.py"
  "python3 publishers/weather_publisher.py"
  "python3 publishers/traffic_publisher.py"
  "python3 subscribers/environmental_monitor.py"
  "python3 subscribers/traffic_manager.py"
  "python3 subscribers/public_interface.py"
)

for cmd in "${commands[@]}"; do
  osascript -e "tell application \"Terminal\" to do script \"cd $(pwd); $cmd\""
done

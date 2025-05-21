# Distributed Publish-Subscribe System for Real-time Data in Smart Cities

This project implements a distributed, fault-tolerant, and scalable publish-subscribe system using Apache Kafka and Docker. It supports real-time data dissemination from multiple publishers (e.g., air quality, weather) to specialized subscribers (e.g., environmental monitor, public interface, traffic manager), simulating a smart city environment.

---

## 📌 Features

- **Scalable Architecture**: Kafka brokers and Docker containers support horizontal scaling of publishers and subscribers.
- **Fault Tolerance**: Kafka replication ensures system availability during broker/node failures.
- **Priority-based Messaging**: Message queues handle different levels of urgency (e.g., emergency alerts).
- **Real-time Streaming**: Efficient, low-latency message delivery for continuous sensor data.
- **Multi-topic Support**: Supports simultaneous publishing and subscribing across multiple topics.
- **Containerized Deployment**: Each component is encapsulated in Docker for environment consistency.
- **Extensible Design**: Easy to plug in new publishers/subscribers.

---

## 🏗️ System Architecture

```
+------------------+        +----------------+        +---------------------+
|  Weather Sensor  | -----> |                | -----> |                     |
+------------------+        |     Kafka      |        |  Traffic Manager    |
+------------------+        |    Cluster     | -----> |  Public Interface   |
| Traffic Sensor   | -----> | (Multi-Broker) |        |  Env. Monitor       |
+------------------+        +----------------+        +---------------------+
+------------------+
|  Air Quality     |
+------------------+
```

Each sensor acts as a **publisher**. Kafka handles message queuing and distribution. Subscribers consume messages relevant to their domain.

---


## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.8+
- `kafka-python` or `confluent-kafka` library

### 1. Clone the Repository
```bash
git clone https://github.com/17keerti/smart_city
cd smart-city
```

### 2. Start the Kafka Cluster
```bash
docker-compose up --build -d
```

## 👥 Authors
- Keerti Chaudhary  
- Meghana Kalle

---

## 📜 License

MIT License

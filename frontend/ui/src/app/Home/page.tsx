"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const images = ["/Home.jpg", "/Home2.avif", "/Home3.avif"];

export default function HomeDashboard() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [airQualityLog, setAirQualityLog] = useState<any[]>([]);
  const [weatherLog, setWeatherLog] = useState<any[]>([]);
  const [trafficLog, setTrafficLog] = useState<any[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [subscribedTopics, setSubscribedTopics] = useState<Set<string>>(
    new Set()
  );

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socketRef.current = io("http://localhost:5001");
    const socket = socketRef.current;

    socket.on("connect", () => console.log("Connected to Socket.IO backend!"));
    socket.on("disconnect", () =>
      console.log("Disconnected from Socket.IO backend!")
    );

    socket.on("available_topics", (topics: string[]) => {
      console.log("Available topics:", topics);
      setAvailableTopics(topics);
    });

    socket.on(
      "subscription_status",
      (status: { topic: string; status: string; message?: string }) => {
        console.log(
          `Subscription status for ${status.topic}: ${status.status}`,
          status.message || ""
        );
        if (status.status === "subscribed") {
          setSubscribedTopics((prev) => new Set(prev).add(status.topic));
        } else if (status.status === "unsubscribed") {
          setSubscribedTopics((prev) => {
            const newSet = new Set(prev);
            newSet.delete(status.topic);
            return newSet;
          });
        }
      }
    );

    socket.on("new_data", (payload: { topic: string; data: any }) => {
      console.log(`Received new data for ${payload.topic}:`, payload.data);
      switch (payload.topic) {
        case "air_quality":
          setAirQualityLog((prev) => [...prev, payload.data].slice(-10));
          break;
        case "weather":
          setWeatherLog((prev) => [...prev, payload.data].slice(-10));
          break;
        case "traffic":
          setTrafficLog((prev) => [...prev, payload.data].slice(-10));
          break;
        default:
          console.warn("Received data for unknown topic:", payload.topic);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const handleLogout = () => {
    if (socketRef.current) socketRef.current.disconnect();
    router.push("/login");
  };

  const toggleSubscription = (topic: string) => {
    if (!socketRef.current) return;
    if (subscribedTopics.has(topic)) {
      socketRef.current.emit("unsubscribe_topic", topic);
    } else {
      socketRef.current.emit("subscribe_topic", topic);
    }
  };

  const renderLogEntries = (log: any[], topic: string) => {
    if (log.length === 0) return <p>No data received yet for {topic}.</p>;
    return (
      <ul className="list-disc list-inside space-y-1">
        {log.map((entry: any, index: number) => (
          <li
            key={index}
            className="bg-white/5 p-1 rounded text-xs break-words"
          >
            <span className="font-medium">
              Time: {new Date(entry.timestamp * 1000).toLocaleTimeString()}
            </span>
            <br />
            {topic === "air_quality" &&
              `PM10: ${entry.pm10}, Ozone: ${entry.ozone}, CO: ${entry.carbon_monoxide}, Priority: ${entry.priority}`}
            {topic === "weather" &&
              `Temp: ${entry.temperature}°C, Humidity: ${entry.humidity}%, Desc: ${entry.description}, Priority: ${entry.priority}`}
            {topic === "traffic" &&
              `Intersection: ${entry.intersection}, Congestion: ${entry.congestion_level}, Priority: ${entry.priority}`}
          </li>
        ))}
      </ul>
    );
  };

  const renderCard = (
    title: string,
    emoji: string,
    description: string,
    topic: string,
    log: any[]
  ) => (
    <div className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-xl p-6 shadow-xl text-white">
      <h2 className="text-2xl font-semibold mb-4">
        {emoji} {title}
      </h2>
      <p className="text-sm mb-2">{description}</p>
      {subscribedTopics.has(topic) ? (
        <>
          <div className="mt-2 mb-4">
            <button
              onClick={() => toggleSubscription(topic)}
              className="px-4 py-1 rounded-full text-xs font-medium bg-red-600 hover:bg-red-700 transition"
            >
              Unsubscribe
            </button>
          </div>
          <div className="text-sm max-h-60 overflow-y-auto">
            <h3 className="font-semibold mb-1">{title} Log:</h3>
            {renderLogEntries(log, topic)}
          </div>
        </>
      ) : (
        <button
          onClick={() => toggleSubscription(topic)}
          className="mt-2 mb-4 px-4 py-1 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-700 transition"
        >
          Subscribe
        </button>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-8 py-12 overflow-hidden">
      {images.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="absolute inset-0 bg-black opacity-40 z-0" />
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleLogout}
          className="bg-white/20 text-white border border-white/30 px-4 py-2 rounded hover:bg-white/30 backdrop-blur-md transition"
        >
          Logout
        </button>
      </div>
      <div className="relative z-10 w-full">
        <h1 className="text-4xl font-bold mb-10 text-white text-center drop-shadow-md">
          Smart City Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {renderCard(
            "Traffic",
            "🚦",
            "Monitor real-time traffic and congestion zones.",
            "traffic",
            trafficLog
          )}
          {renderCard(
            "Weather",
            "🌤️",
            "Get live weather updates and forecasts.",
            "weather",
            weatherLog
          )}
          {renderCard(
            "Environment",
            "🌿",
            "Track air quality and pollution levels.",
            "air_quality",
            airQualityLog
          )}
        </div>
      </div>
    </div>
  );
}

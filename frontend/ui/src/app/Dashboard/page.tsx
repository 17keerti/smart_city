"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

type Topic = "air_quality" | "weather" | "traffic";

const images = ["/Home.jpg", "/Home2.avif", "/Home3.avif"];
const allTopics: Topic[] = ["air_quality", "weather", "traffic"];

export default function HomeDashboard() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [logs, setLogs] = useState<Record<Topic, any[]>>({
    air_quality: [],
    weather: [],
    traffic: [],
  });

  const [subscribers, setSubscribers] = useState<Record<string, Set<Topic>>>({
    traffic_manager: new Set(),
    environment_monitor: new Set(),
    public_interface: new Set(allTopics),
  });

  const [logVisibility, setLogVisibility] = useState<
    Record<string, Record<Topic, boolean>>
  >({
    traffic_manager: { air_quality: false, weather: false, traffic: false },
    environment_monitor: { air_quality: false, weather: false, traffic: false },
    public_interface: { air_quality: true, weather: true, traffic: true },
  });

  const [publisherVisibility, setPublisherVisibility] = useState<
    Record<Topic, boolean>
  >({
    air_quality: false,
    weather: false,
    traffic: false,
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const socket = io("http://localhost:5001");
    socketRef.current = socket;

    socket.on("connect", () => console.log("Connected to backend"));
    socket.on("disconnect", () => console.log("Disconnected from backend"));

    socket.on("new_data", ({ topic, data }: { topic: Topic; data: any }) => {
      setLogs((prev) => ({
        ...prev,
        [topic]: [...prev[topic], data].slice(-10),
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleSubscription = (subscriber: string, topic: Topic) => {
    setSubscribers((prev) => {
      const updated = new Set(prev[subscriber]);
      const socket = socketRef.current;
      const isSubscribed = updated.has(topic);

      if (isSubscribed) {
        updated.delete(topic);
        socket?.emit("unsubscribe_topic", topic);
      } else {
        updated.add(topic);
        socket?.emit("subscribe_topic", topic);
      }

      setLogVisibility((v) => ({
        ...v,
        [subscriber]: {
          ...v[subscriber],
          [topic]: !isSubscribed,
        },
      }));

      return { ...prev, [subscriber]: updated };
    });
  };

  const renderLogEntries = (log: any[], topic: Topic) => (
    <ul className="list-disc list-inside text-xs space-y-1 mt-2 max-h-24 overflow-y-auto">
      {log.length === 0 ? (
        <li>No data yet for {topic}</li>
      ) : (
        log.map((entry, idx) => (
          <li key={idx} className="bg-white/5 p-1 rounded">
            <span className="font-medium">
              {new Date(entry.timestamp * 1000).toLocaleTimeString()}
            </span>
            <br />
            {topic === "air_quality" &&
              `PM10: ${entry.pm10}, Ozone: ${entry.ozone}, CO: ${entry.carbon_monoxide}`}
            {topic === "weather" &&
              `Temp: ${entry.temperature}°C, Humidity: ${entry.humidity}%, Desc: ${entry.description}`}
            {topic === "traffic" &&
              `Intersection: ${entry.intersection}, Congestion: ${entry.congestion_level}`}
          </li>
        ))
      )}
    </ul>
  );

  const renderTopicCard = (
    subscriber: string,
    topic: Topic,
    topics: Set<Topic>
  ) => (
    <div
      key={topic}
      className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg rounded-xl p-4 text-white w-full sm:w-[45%]"
    >
      <h4 className="text-lg font-semibold capitalize mb-2">
        {topic.replace("_", " ")}
      </h4>
      <p className="text-sm mb-2">
        {topic === "traffic" &&
          "Monitor real-time traffic and congestion zones."}
        {topic === "weather" && "Get live weather updates and forecasts."}
        {topic === "air_quality" && "Track air quality and pollution levels."}
      </p>
      <button
        onClick={() => toggleSubscription(subscriber, topic)}
        className={`mb-2 px-4 py-1 rounded-full text-sm font-medium transition ${
          topics.has(topic)
            ? "bg-red-600 hover:bg-red-700"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {topics.has(topic) ? "Unsubscribe" : "Subscribe"}
      </button>
      {logVisibility[subscriber]?.[topic] && (
        <div className="text-xs">
          <strong>{topic.replace("_", " ")} Log:</strong>
          {renderLogEntries(logs[topic], topic)}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen px-6 py-12 bg-gradient-to-br from-slate-900 to-slate-800 grid grid-cols-1 lg:grid-cols-2 gap-12">
      {images.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out z-0 ${
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="absolute inset-0 bg-black opacity-60 z-0" />

      {/* LEFT SIDE: Publishers */}
      <div className="relative z-10">
        <h2 className="text-2xl font-semibold text-white mb-4">
          📤 Publisher Logs
        </h2>
        <div className="space-y-6">
          {allTopics.map((topic) => (
            <div
              key={topic}
              onClick={() =>
                setPublisherVisibility((prev) => ({
                  ...prev,
                  [topic]: !prev[topic],
                }))
              }
              className="bg-white/10 border border-white/20 backdrop-blur-md rounded-xl p-4 text-white shadow-lg cursor-pointer hover:ring-2 hover:ring-white"
            >
              <h3 className="text-lg font-semibold mb-2 capitalize">
                {topic.replace("_", " ")} Publisher
              </h3>
              {publisherVisibility[topic] &&
                renderLogEntries(logs[topic], topic)}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE: Subscribers */}
      <div className="relative z-10">
        <h2 className="text-2xl font-semibold text-white mb-6">
          📥 Subscriber Views
        </h2>
        <div className="space-y-10">
          {Object.entries(subscribers).map(([subscriber, topics]) => (
            <div key={subscriber}>
              <h3 className="text-xl text-white font-bold mb-4 capitalize">
                {subscriber.replace("_", " ").replace("interface", "Interface")}
              </h3>
              <div className="flex flex-wrap justify-start gap-4">
                {allTopics.map((topic) =>
                  renderTopicCard(subscriber, topic, topics)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

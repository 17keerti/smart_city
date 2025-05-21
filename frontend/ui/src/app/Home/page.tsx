"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client"; // Import io and Socket type

const images = ["/Home.jpg", "/Home2.avif", "/Home3.avif"];

export default function HomeDashboard() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // State to hold the logs for each data stream, now updated via WebSocket
  const [airQualityLog, setAirQualityLog] = useState<any[]>([]);
  const [weatherLog, setWeatherLog] = useState<any[]>([]);
  const [trafficLog, setTrafficLog] = useState<any[]>([]);

  // State to manage available topics from the backend
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  // State to manage which topics the user has actively subscribed to
  const [subscribedTopics, setSubscribedTopics] = useState<Set<string>>(new Set());

  // Ref to hold the Socket.IO client instance
  const socketRef = useRef<Socket | null>(null);

  // Effect for auto-rotating background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Effect for Socket.IO connection and event handling
  useEffect(() => {
    // Initialize Socket.IO connection
    // Ensure the URL matches your Flask backend's Socket.IO server address
    socketRef.current = io("http://localhost:5001");

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to Socket.IO backend!");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO backend!");
    });

    // Handle initial list of available topics from the backend
    socket.on("available_topics", (topics: string[]) => {
      console.log("Available topics:", topics);
      setAvailableTopics(topics);
      // Automatically subscribe to all topics on connect for initial setup
      // topics.forEach(topic => {
      //   socket.emit('subscribe_topic', topic);
      //   setSubscribedTopics(prev => new Set(prev).add(topic));
      // });
    });

    // Handle subscription status updates (success/failure)
    socket.on("subscription_status", (status: { topic: string, status: string, message?: string }) => {
      console.log(`Subscription status for ${status.topic}: ${status.status}`, status.message || '');
      if (status.status === 'subscribed') {
        setSubscribedTopics(prev => new Set(prev).add(status.topic));
      } else if (status.status === 'unsubscribed') {
        setSubscribedTopics(prev => {
          const newSet = new Set(prev);
          newSet.delete(status.topic);
          return newSet;
        });
      }
    });

    // Handle incoming data messages from Kafka via Socket.IO
    socket.on("new_data", (payload: { topic: string, data: any }) => {
      console.log(`Received new data for ${payload.topic}:`, payload.data);
      // Update the correct log based on the topic
      switch (payload.topic) {
        case "air_quality":
          setAirQualityLog(prev => {
            const newLog = [...prev, payload.data];
            // Keep log size limited on the frontend too for display
            return newLog.slice(-10); // Show last 10 entries
          });
          break;
        case "weather":
          setWeatherLog(prev => {
            const newLog = [...prev, payload.data];
            return newLog.slice(-10);
          });
          break;
        case "traffic":
          setTrafficLog(prev => {
            const newLog = [...prev, payload.data];
            return newLog.slice(-10);
          });
          break;
        default:
          console.warn("Received data for unknown topic:", payload.topic);
      }
    });

    // Cleanup function: disconnect socket when component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  const handleLogout = () => {
    console.log("Logging out...");
    // Disconnect socket before navigating away
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    router.push("/login");
  };

  const toggleSubscription = (topic: string) => {
    if (!socketRef.current) return;

    if (subscribedTopics.has(topic)) {
      socketRef.current.emit('unsubscribe_topic', topic);
    } else {
      socketRef.current.emit('subscribe_topic', topic);
    }
  };

  // Helper function to render log entries
  const renderLogEntries = (log: any[], topic: string) => {
    if (log.length === 0) {
      return <p>No data received yet for {topic}.</p>;
    }
    return (
      <ul className="list-disc list-inside space-y-1">
        {log.map((entry: any, index: number) => (
          <li key={index} className="bg-white/5 p-1 rounded text-xs break-words">
            <span className="font-medium">Time: {new Date(entry.timestamp * 1000).toLocaleTimeString()}</span>
            <br />
            {topic === 'air_quality' && `PM10: ${entry.pm10}, Ozone: ${entry.ozone}, CO: ${entry.carbon_monoxide}, Priority: ${entry.priority}`}
            {topic === 'weather' && `Temp: ${entry.temperature}°C, Humidity: ${entry.humidity}%, Desc: ${entry.description}, Priority: ${entry.priority}`}
            {topic === 'traffic' && `Intersection: ${entry.intersection}, Congestion: ${entry.congestion_level}, Priority: ${entry.priority}`}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-8 py-12 overflow-hidden">
      {/* Slideshow Background Images */}
      {images.map((src, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}

      {/* Dark overlay to reduce brightness */}
      <div className="absolute inset-0 bg-black opacity-40 z-0" />

      {/* Logout Button */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={handleLogout}
          className="bg-white/20 text-white border border-white/30 px-4 py-2 rounded hover:bg-white/30 backdrop-blur-md transition"
        >
          Logout
        </button>
      </div>

      {/* Page Content */}
      <div className="relative z-10 w-full">
        <h1 className="text-4xl font-bold mb-10 text-white text-center drop-shadow-md">
          Smart City Dashboard
        </h1>

        {/* Dynamic Subscription Section */}
        <div className="max-w-7xl mx-auto mb-8 p-6 backdrop-blur-lg bg-white/10 border border-white/30 rounded-xl shadow-xl text-white">
          <h2 className="text-2xl font-semibold mb-4">Manage Subscriptions</h2>
          <div className="flex flex-wrap gap-4">
            {availableTopics.length > 0 ? (
              availableTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleSubscription(topic)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    subscribedTopics.has(topic)
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {subscribedTopics.has(topic) ? `Unsubscribe from ${topic.replace('_', ' ').toUpperCase()}` : `Subscribe to ${topic.replace('_', ' ').toUpperCase()}`}
                </button>
              ))
            ) : (
              <p>Loading available topics...</p>
            )}
          </div>
        </div>

        {/* Data Display Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Traffic Card */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-xl p-6 shadow-xl text-white">
            <h2 className="text-2xl font-semibold mb-4">🚦 Traffic</h2>
            <p className="text-sm mb-2">
              Monitor real-time traffic and congestion zones.
            </p>
            <div className="mt-4 text-sm max-h-60 overflow-y-auto">
              <h3 className="font-semibold mb-1">Traffic Log:</h3>
              {renderLogEntries(trafficLog, 'traffic')}
            </div>
          </div>

          {/* Weather Card */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-xl p-6 shadow-xl text-white">
            <h2 className="text-2xl font-semibold mb-4">🌤️ Weather</h2>
            <p className="text-sm mb-2">
              Get live weather updates and forecasts.
            </p>
            <div className="mt-4 text-sm max-h-60 overflow-y-auto">
              <h3 className="font-semibold mb-1">Weather Log:</h3>
              {renderLogEntries(weatherLog, 'weather')}
            </div>
          </div>

          {/* Environment Card - Displays live air quality data log */}
          <div className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-xl p-6 shadow-xl text-white">
            <h2 className="text-2xl font-semibold mb-4">🌿 Environment</h2>
            <p className="text-sm mb-2">
              Track air quality and pollution levels.
            </p>
            <div className="mt-4 text-sm max-h-60 overflow-y-auto">
              <h3 className="font-semibold mb-1">Air Quality Log:</h3>
              {renderLogEntries(airQualityLog, 'air_quality')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


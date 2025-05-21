"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const images = ["/Home.jpg", "/Home2.avif", "/Home3.avif"];

export default function HomeDashboard() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-rotate background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    console.log("Logging out...");
    router.push("/login");
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {["Traffic", "Weather", "Environment"].map((title, idx) => (
            <div
              key={idx}
              className="backdrop-blur-lg bg-white/10 border border-white/30 rounded-xl p-6 shadow-xl text-white hover:bg-white/20 transition"
            >
              <h2 className="text-2xl font-semibold mb-4">
                {title === "Traffic"
                  ? "🚦 Traffic"
                  : title === "Weather"
                  ? "🌤️ Weather"
                  : "🌿 Environment"}
              </h2>
              <p className="text-sm">
                {title === "Traffic"
                  ? "Monitor real-time traffic and congestion zones."
                  : title === "Weather"
                  ? "Get live weather updates and forecasts."
                  : "Track air quality and pollution levels."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

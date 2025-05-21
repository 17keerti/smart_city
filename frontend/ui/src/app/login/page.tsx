"use client";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/16/solid";
import { useRouter } from "next/navigation";
import React from "react";

export default function Login() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false); // 👁️ state
  const router = useRouter();

  const handleLogin = () => {
    router.push("/Home");
  };

  return (
    <div
      className="min-h-screen flex justify-end bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/loginBg.jpg')` }}
    >
      <div className="flex flex-row items-center justify-center w-[50vw] backdrop-blur-md min-h-screen">
        <div className="flex flex-col items-center justify-center h-full text-black gap-20 w-full px-10">
          <h1 className="text-white text-5xl font-bold">Welcome Back</h1>

          <form
            className="text-white w-full"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="flex flex-col pb-5">
              <label className="text-lg">Username</label>
              <input
                value={email}
                type="text"
                placeholder="Enter your Username"
                required
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full mb-4 p-4 pl-0 rounded bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col relative">
              <label>Password</label>
              <input
                value={password}
                type={showPassword ? "text" : "password"} // 👁️ toggle here
                placeholder="Enter your Password"
                required
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full mb-4 p-4 pl-0 pr-10 rounded bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
              />

              {/* Eye Icon Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[50%] -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex flex-col gap-5">
              <button
                type="submit"
                className="w-full bg-white text-black text-lg py-3 rounded cursor-pointer hover:bg-gray-200 transition duration-300 ease-in-out mt-8"
              >
                Login
              </button>
              <p className="text-center text-md">
                Don't have an account?{" "}
                <a
                  href="/Signup"
                  className="text-blue-500 font-bold hover:underline"
                >
                  Sign Up
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

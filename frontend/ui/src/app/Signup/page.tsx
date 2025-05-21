"use client";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import React from "react";

export default function SignUp() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // 👇 Derived state to check if passwords match
  const isPasswordMatch = password === confirmPassword;

  const handleSignUp = () => {
    if (!isPasswordMatch) return;
    console.log("Signup clicked", { email, password });
  };

  return (
    <div
      className="min-h-screen flex justify-end bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/loginBg.jpg')` }}
    >
      <div className="flex flex-row items-center justify-center w-[50vw] backdrop-blur-md min-h-screen">
        <div className="flex flex-col items-center justify-center h-full text-black gap-20 w-full px-10">
          <h1 className="text-white text-4xl md:text-5xl font-bold text-center">
            Welcome To Smart Cities
          </h1>

          <form
            className="text-white w-full"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignUp();
            }}
          >
            {/* Username Field */}
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

            {/* Password Field */}
            <div className="flex flex-col relative pb-5">
              <label>Password</label>
              <input
                value={password}
                type={showPassword ? "text" : "password"}
                placeholder="Enter your Password"
                required
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full p-4 pl-0 pr-10 rounded bg-transparent border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
              />
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

            {/* Confirm Password Field */}
            <div className="flex flex-col relative">
              <label>Confirm Password</label>
              <input
                value={confirmPassword}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your Password"
                required
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`block w-full p-4 pl-0 pr-10 rounded bg-transparent border-b-2 ${
                  isPasswordMatch ? "border-gray-300" : "border-red-500"
                } focus:outline-none focus:border-blue-500`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-[50%] -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>

              {/* 🔴 Show error if passwords don't match */}
              {!isPasswordMatch && confirmPassword && (
                <span className="text-sm text-red-500 mt-2">
                  Passwords do not match
                </span>
              )}
            </div>
            <div className="flex flex-col gap-5">
              <button
                type="submit"
                disabled={!isPasswordMatch}
                className="w-full bg-white text-black text-lg py-3 rounded cursor-pointer hover:bg-gray-200 transition duration-300 ease-in-out mt-8"
              >
                Sign Up
              </button>
              <p className="text-center text-md">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="text-blue-500 font-bold hover:underline"
                >
                  Login
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

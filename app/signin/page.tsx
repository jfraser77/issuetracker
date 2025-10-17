"use client";

import { signin } from "@/app/actions/auth";
import Link from "next/link";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import Image from "next/image";

export default function SigninPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    twoFactorCode: "",
    rememberMe: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await signin(formData);
    } catch (error) {
      console.error("Signin error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // First, verify email/password
      const response = await fetch("/api/auth/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      if (response.ok) {
        // If credentials are valid, send 2FA code
        const twoFactorResponse = await fetch("/api/auth/send-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email }),
        });

        if (twoFactorResponse.ok) {
          setShowTwoFactor(true);
        }
      } else {
        alert("Invalid email or password");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
     
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-between bg-gradient-to-br from-blue-600 to-blue-800 p-12 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
            <Image
              src="/nsn_revenue_resources_logo.jpg"
              alt="NSN Revenue Resources"
              width={48}
              height={48}
              className="rounded-lg"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">NSN Revenue Resources</h1>
            <p className="text-blue-100 text-sm">IT Management Portal</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-6">
              NSN IT Management Portal
            </h2>
            <p className="text-blue-100 text-lg">
              Secure access to management tools
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-blue-100">Secure authentication</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-blue-100">Enterprise security</span>
            </div>
          </div>
        </div>

        <div className="text-blue-100 text-sm">
          <p>Secure • Professional</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 lg:flex-none">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Mobile Logo & Title */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Image
                src="/nsn_revenue_resources_logo.jpg"
                alt="NSN Revenue Resources"
                width={64}
                height={64}
                className="rounded-lg"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              NSN IT Management Portal
            </h1>
            <p className="text-gray-600 text-center">
              Secure access to management tools
            </p>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:block text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sign In
            </h1>
            <p className="text-gray-600">
              Access your account
            </p>
          </div>

          <div className="bg-white lg:bg-transparent rounded-2xl lg:rounded-none p-6 lg:p-0 shadow-xl lg:shadow-none border border-gray-200 lg:border-none">
            {!showTwoFactor ? (
              // Email/Password Form
              <form className="space-y-6" onSubmit={handleEmailPasswordSubmit}>
                <div className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockClosedIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                      Keep me signed in
                    </label>
                  </div>

                  <div className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </div>

                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Need access?{" "}
                    <Link
                      href="/signup"
                      className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Request account
                    </Link>
                  </p>
                </div>
              </form>
            ) : (
              // 2FA Form
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <EnvelopeIcon className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Check your email
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Verification code sent to <strong>{formData.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter 6-digit code
                  </label>
                  <div className="mt-1">
                    <input
                      id="twoFactorCode"
                      name="twoFactorCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={formData.twoFactorCode}
                      onChange={(e) => setFormData({ ...formData, twoFactorCode: e.target.value.replace(/\D/g, '') })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl font-mono tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                      placeholder="000000"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="rememberMe2fa"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe2fa" className="ml-2 block text-sm text-gray-900">
                    Keep me signed in
                  </label>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowTwoFactor(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || formData.twoFactorCode.length !== 6}
                    className="flex-1 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                    ) : (
                      "Verify & Sign In"
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoading(true);
                      await fetch("/api/auth/send-2fa", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: formData.email }),
                      });
                      setIsLoading(false);
                      alert("New code sent!");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Security Footer */}
          <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-600">
              <svg className="flex-shrink-0 mr-2 h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure enterprise authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useState, useEffect } from "react";
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  const themeOptions = [
    {
      id: "light",
      name: "Light",
      description: "Light theme with white backgrounds",
      icon: SunIcon,
    },
    {
      id: "dark",
      name: "Dark",
      description: "Dark theme with dark backgrounds",
      icon: MoonIcon,
    },
    {
      id: "system",
      name: "System",
      description: "Follow your system theme preference",
      icon: ComputerDesktopIcon,
    },
  ];

  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "system") {
      // For system theme, we'll use the system preference
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (systemPrefersDark && theme !== "dark") {
        toggleTheme();
      } else if (!systemPrefersDark && theme !== "light") {
        toggleTheme();
      }
      localStorage.removeItem("theme"); // Clear saved preference to use system
    } else {
      if (theme !== newTheme) {
        toggleTheme();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your application preferences
          </p>
        </div>

        {/* Theme Settings Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Appearance
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Customize how the application looks
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Theme
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {themeOptions.map((option) => {
                    const isSelected =
                      option.id === "system"
                        ? !localStorage.getItem("theme")
                        : theme === option.id;

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleThemeChange(option.id)}
                        className={`relative p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected
                                ? "bg-blue-100 dark:bg-blue-800"
                                : "bg-gray-100 dark:bg-gray-600"
                            }`}
                          >
                            <option.icon
                              className={`h-5 w-5 ${
                                isSelected
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-gray-600 dark:text-gray-400"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {option.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {option.description}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-blue-500 rounded-full p-1">
                              <CheckIcon className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Theme Preview */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Preview
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Theme Preview */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-white p-4 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div className="h-4 bg-white rounded border border-gray-200"></div>
                        <div className="h-4 bg-white rounded border border-gray-200 w-3/4"></div>
                        <div className="h-4 bg-white rounded border border-gray-200 w-1/2"></div>
                      </div>
                    </div>
                    <div className="bg-white p-3 text-center border-t border-gray-200">
                      <span className="text-xs text-gray-600">Light Theme</span>
                    </div>
                  </div>

                  {/* Dark Theme Preview */}
                  <div className="border border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 p-4 border-b border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-900">
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-800 rounded border border-gray-700"></div>
                        <div className="h-4 bg-gray-800 rounded border border-gray-700 w-3/4"></div>
                        <div className="h-4 bg-gray-800 rounded border border-gray-700 w-1/2"></div>
                      </div>
                    </div>
                    <div className="bg-gray-800 p-3 text-center border-t border-gray-700">
                      <span className="text-xs text-gray-400">Dark Theme</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Settings Sections can be added here */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            More Settings Coming Soon
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Additional customization options will be available in future
            updates.
          </p>
        </div>
      </div>
    </div>
  );
}

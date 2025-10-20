"use client";

// Import React hooks for state management and side effects
import { useState, useEffect } from "react";
// Import Heroicons for consistent UI icons
import {
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
// Import TypeScript interfaces for type safety
import { StatItem, ActivityItem } from "../types";
// Import Next.js components for client-side navigation
import Link from "next/link";

/**
 * User interface defining the structure of user data
 * Used for current user authentication and role-based access control
 */
interface User {
  id: number;
  name: string;
  email: string;
  role: string; // "Admin", "I.T.", "HR", "Trainer", or "User"
}

/**
 * DashboardStats interface defining the structure of dashboard metrics
 * These stats are fetched from the API and displayed in the stat cards
 */
interface DashboardStats {
  totalEmployees: number;
  newThisMonth: number;
  pendingTerminations: number;
  availableLaptops: number;
}

/**
 * Main Dashboard component - serves as the landing page after login
 * Displays key metrics, alerts, and recent activity based on user role
 */
export default function Dashboard() {
  // STATE MANAGEMENT
  
  /**
   * currentUser - Stores the authenticated user's information
   * Used for role-based UI rendering and permissions
   */
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  /**
   * stats - Dashboard metrics fetched from API
   * Includes employee counts, termination stats, and IT inventory
   */
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    newThisMonth: 0,
    pendingTerminations: 0,
    availableLaptops: 0
  });

  /**
   * activities - Recent system activities for the activity table
   * Shows employee onboarding, terminations, and status changes
   */
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  /**
   * newEmployeesCount - Count of new employees needing IT setup
   * Used to show/hide the IT setup alert card
   */
  const [newEmployeesCount, setNewEmployeesCount] = useState(0);

  /**
   * isClient - Prevents hydration errors by tracking client-side rendering
   * Important for Next.js SSR to avoid mismatches between server and client
   */
  const [isClient, setIsClient] = useState(false);

  /**
   * refreshing - Loading state for data refresh operations
   * Provides visual feedback during API calls
   */
  const [refreshing, setRefreshing] = useState(false);

  // SIDE EFFECTS - DATA FETCHING

  /**
   * useEffect hook runs once on component mount
   * Sets up initial data fetching and auto-refresh interval
   */
  useEffect(() => {
    // Mark component as client-side to prevent SSR hydration issues
    setIsClient(true);
    
    // Fetch initial data
    fetchCurrentUser();
    fetchDashboardData();
    fetchNewEmployeesCount();

    /**
     * Auto-refresh data every 30 seconds to keep dashboard current
     * Returns cleanup function to clear interval on component unmount
     */
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNewEmployeesCount();
    }, 30000);

    // Cleanup function - prevents memory leaks
    return () => clearInterval(interval);
  }, []); // Empty dependency array means this runs once on mount

  // API FUNCTIONS

  /**
   * fetchCurrentUser - Gets the currently authenticated user's data
   * Used for role-based access control throughout the application
   */
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("/api/auth/user");
      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  /**
   * fetchDashboardData - Fetches dashboard statistics and recent activities
   * Uses Promise.all to make parallel API calls for better performance
   */
  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // Parallel API calls for stats and activities
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activities")
      ]);

      // Update stats if API call successful
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Update activities if API call successful
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * fetchNewEmployeesCount - Gets count of active employees for IT alert
   * Specifically used to determine if IT setup alerts should be shown
   */
  const fetchNewEmployeesCount = async () => {
    try {
      const response = await fetch("/api/employees?status=active");
      if (response.ok) {
        const employees = await response.json();
        setNewEmployeesCount(employees.length);
      }
    } catch (error) {
      console.error("Error fetching employees count:", error);
    }
  };

  // CLIENT-SIDE RENDERING GUARD

  /**
   * Prevents rendering until component is confirmed to be on client-side
   * Critical for Next.js to avoid hydration mismatches between server and client
   */
  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  // ROLE-BASED ACCESS VARIABLES

  /**
   * isAdminOrIT - Boolean indicating if user has Admin or I.T. privileges
   * Controls visibility of IT-specific features and alerts
   */
  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";

  /**
   * isHR - Boolean indicating if user has HR privileges
   * Could be used for HR-specific features (currently not utilized)
   */
  const isHR = currentUser?.role === "HR";

  // UI HELPER VARIABLES

  /**
   * currentDate - Formatted current date for display in header
   * Uses US locale with full month name for better readability
   */
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /**
   * statCards - Array of statistic cards to display
   * Dynamically includes IT-specific cards based on user role
   * Each card has icon, value, label, color, and optional navigation link
   */
  const statCards: (StatItem & { link?: string })[] = [
    {
      icon: UserPlusIcon,
      value: stats.newThisMonth,
      label: "New This Month",
      color: "text-green-500", // Green for positive growth indicator
      link: "/management-portal/onboarding", // Navigates to onboarding page
    },
    {
      icon: UserMinusIcon,
      value: stats.pendingTerminations,
      label: "Pending Terminations",
      color: "text-red-500", // Red for attention-required items
      link: "/management-portal/terminations", // Navigates to terminations page
    },
    // Conditionally include IT assets card for Admin/I.T. users only
    ...(isAdminOrIT ? [{
      icon: ComputerDesktopIcon,
      value: stats.availableLaptops,
      label: "Available Laptops",
      color: "text-yellow-500", // Yellow for inventory/warning items
      link: "/management-portal/it-assets", // Navigates to IT assets page
    }] : [])
  ];

  // COMPONENT RENDER

  return (
    <div suppressHydrationWarning>
      {/* PAGE HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Employee Management Dashboard
        </h1>
        <span className="text-gray-500">Today: {currentDate}</span>
      </div>

      {/* ALERT CARDS SECTION */}

      {/* IT Setup Alert - Only shown to Admin/I.T. when new employees exist */}
      {isAdminOrIT && newEmployeesCount > 0 && (
        <div className="mb-6">
          <Link href="/management-portal/onboarding">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors cursor-pointer">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-800">
                    New Employee IT Setup Needs Assignment
                  </h3>
                  <p className="text-amber-700">
                    {newEmployeesCount} new employee{newEmployeesCount !== 1 ? 's' : ''} require IT equipment setup
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {newEmployeesCount}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Overdue Equipment Alert - Always shown to Admin/I.T. users */}
      {isAdminOrIT && (
        <div className="mb-6">
          <Link href="/management-portal/terminations?filter=overdue">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors cursor-pointer">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">
                    Overdue Equipment Returns
                  </h3>
                  <p className="text-red-700">
                    Equipment returns past 30-day deadline need attention
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Alert
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* STATISTICS CARDS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          /**
           * cardContent - Reusable card component with icon, value, and label
           * Includes hover effects for clickable cards with links
           */
          const cardContent = (
            <div className={`bg-white rounded-lg shadow-sm p-6 ${stat.link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
              <IconComponent className={`h-8 w-8 ${stat.color} mb-4`} />
              <div className="text-3xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          );

          /**
           * Wrap clickable cards with Link component for navigation
           * Non-clickable cards render directly
           */
          return stat.link ? (
            <Link key={index} href={stat.link}>
              {cardContent}
            </Link>
          ) : (
            <div key={index}>
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* RECENT ACTIVITY TABLE SECTION */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activity.employee}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.activity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Dynamic status styling based on activity state */}
                    <span className={`status status-${activity.status}`}>
                      {activity.status === "completed" && "Completed"}
                      {activity.status === "pending" && "Laptop Pending"}
                      {activity.status === "warning" && "IT Setup"}
                      {activity.status === "terminated" && "Terminated"}
                      {activity.status === "overdue" && "Overdue Return"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
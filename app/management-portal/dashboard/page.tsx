"use client";

import { useState, useEffect } from "react";
import {
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { StatItem, ActivityItem } from "../types";
import Link from "next/link";

/**
 * User interface defining the structure of user data
 * Used for storing current logged-in user information
 */
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * DashboardStats interface defining all statistical metrics
 * Optional properties for role-specific metrics that may not be available to all users
 */
interface DashboardStats {
  totalEmployees: number; // Count of all active employees
  newThisMonth: number; // Employees added in current month
  pendingTerminations: number; // Termination requests in progress
  availableLaptops: number; // Laptops available for assignment
  pendingApprovals?: number; // Role upgrade requests awaiting approval (Admin/IT only)
  archivedCount?: number; // Archived/terminated records (Reporting roles)
  completionRate?: number; // Onboarding completion percentage (HR/Admin)
  overdueReturns?: number; // Equipment returns past deadline (IT only)
}

/**
 * DashboardActivities interface organizing activity data into categories
 * Used for displaying different sections of activities and alerts
 */
interface DashboardActivities {
  recentActivities: ActivityItem[]; // General system activities from last 30 days
  pendingActions: ActivityItem[]; // Items requiring immediate attention
  systemAlerts: ActivityItem[]; // System-wide warnings and notifications
}

/**
 * Main Dashboard Component
 * Displays role-based metrics, alerts, and quick actions
 * Features dynamic content based on user permissions
 */
export default function Dashboard() {
  // STATE MANAGEMENT: Track component data and UI state
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Current logged-in user data
  const [stats, setStats] = useState<DashboardStats>({
    // Dashboard metrics and statistics
    totalEmployees: 0,
    newThisMonth: 0,
    pendingTerminations: 0,
    availableLaptops: 0,
    pendingApprovals: 0,
    archivedCount: 0,
    completionRate: 0,
    overdueReturns: 0,
  });
  const [activities, setActivities] = useState<DashboardActivities>({
    // Activity and alert data
    recentActivities: [],
    pendingActions: [],
    systemAlerts: [],
  });
  const [newEmployeesCount, setNewEmployeesCount] = useState(0); // Count of new employees needing IT setup
  const [isClient, setIsClient] = useState(false); // Track if component is running on client
  const [refreshing, setRefreshing] = useState(false); // Loading state for data refresh

  /**
   * useEffect: Component lifecycle management
   * - Sets client-side flag for hydration
   * - Fetches initial data on component mount
   * - Sets up auto-refresh interval (30 seconds)
   * - Cleans up interval on component unmount
   */
  useEffect(() => {
    setIsClient(true); // Mark as client-side rendered
    fetchCurrentUser(); // Get current user data
    fetchDashboardData(); // Load dashboard metrics and activities
    fetchNewEmployeesCount(); // Get count of new employees

    // Set up auto-refresh interval (30 seconds)
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNewEmployeesCount();
    }, 30000);

    // Cleanup: Clear interval when component unmounts
    return () => clearInterval(interval);
  }, []);

  /**
   * fetchCurrentUser: Retrieves current logged-in user data
   * Used for role-based access control and personalization
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
   * fetchDashboardData: Fetches all dashboard metrics and activities
   * Uses Promise.all for parallel API calls to improve performance
   * Sets refreshing state to show loading indicator
   */
  const fetchDashboardData = async () => {
    setRefreshing(true); // Show loading state
    try {
      // Fetch stats and activities in parallel
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activities"),
      ]);

      // Process stats response
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Process activities response
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setActivities(activitiesData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setRefreshing(false); // Hide loading state
    }
  };

  /**
   * fetchNewEmployeesCount: Gets count of active employees
   * Used specifically for IT setup alert calculations
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

  // ROLE-BASED ACCESS CONTROL: Boolean flags for permission checking
  const isAdmin = currentUser?.role === "Admin"; // Full system access
  const isIT = currentUser?.role === "I.T."; // IT management access
  const isHR = currentUser?.role === "HR"; // Human resources access
  const isTrainer = currentUser?.role === "Trainer"; // Training management access

  // COMPOUND PERMISSIONS: Combined role permissions for common scenarios
  const isAdminOrIT = isAdmin || isIT; // IT asset and approval management
  const canManageUsers = isAdmin || isHR; // User and employee management
  const canViewReports = isAdmin || isIT || isHR; // Reporting and analytics access
  const canManageApprovals = isAdmin || isIT; // Role approval management

  // Loading state: Show loading message until client-side rendering is complete
  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  /**
   * currentDate: Formatted current date for display
   * Used in dashboard header for context
   */
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /**
   * statCards: Dynamic array of statistic cards
   * - Core metrics shown to all users
   * - Role-specific metrics conditionally added based on permissions
   * - Each card includes icon, value, label, color, and optional link/description
   */
  const statCards: (StatItem & {
    link?: string; // Optional navigation link
    description?: string; // Additional context for the metric
    roleRestricted?: boolean; // Flag for role-specific metrics
  })[] = [
    // CORE METRICS: Shown to all users regardless of role
    // {
    //   icon: UsersIcon,
    //   value: stats.totalEmployees,
    //   label: "Total Employees",
    //   color: "text-blue-500",
    //   description: "Active employees in system",
    // },
    {
      icon: UserPlusIcon,
      value: stats.newThisMonth,
      label: "New This Month",
      color: "text-green-500",
      link: "/management-portal/onboarding",
      description: "Employees added this month",
    },
    {
      icon: UserMinusIcon,
      value: stats.pendingTerminations,
      label: "Pending Terminations",
      color: "text-red-500",
      link: "/management-portal/terminations",
      description: "Terminations in progress",
    },

    // IT-SPECIFIC METRICS: Only shown to Admin and IT roles
    ...(isAdminOrIT
      ? [
          {
            icon: ComputerDesktopIcon,
            value: stats.availableLaptops,
            label: "Available Laptops",
            color: "text-yellow-500",
            link: "/management-portal/it-assets",
            description: "Laptops ready for assignment",
            roleRestricted: true,
          },
        ]
      : []),

    // ADMIN APPROVAL METRICS: Only shown to Admin role
    ...(isAdmin
      ? [
          {
            icon: ClockIcon,
            value: stats.pendingApprovals || 0,
            label: "Pending Approvals",
            color: "text-orange-500",
            link: "/management-portal/admin/approvals",
            description: "Role upgrade requests",
            roleRestricted: true,
          },
        ]
      : []),

    // ARCHIVE METRICS: Shown to reporting roles (Admin, IT, HR)
    ...(canViewReports
      ? [
          {
            icon: ArchiveBoxIcon,
            value: stats.archivedCount || 0,
            label: "Archived Records",
            color: "text-purple-500",
            link: "/management-portal/onboarding/archived",
            description: "Completed onboarding processes",
            roleRestricted: true,
          },
        ]
      : []),

    // COMPLETION RATE METRICS: Shown to user management roles (Admin, HR)
    ...(canManageUsers
      ? [
          {
            icon: ChartBarIcon,
            value: `${stats.completionRate || 0}%`,
            label: "Completion Rate",
            color: "text-indigo-500",
            link: "/management-portal/reports",
            description: "Onboarding completion average",
            roleRestricted: true,
          },
        ]
      : []),
  ];

  /**
   * RENDER: Main dashboard UI with conditional rendering based on user role
   * Organized into sections: Header, Alerts, Statistics, Activities, Quick Actions
   */
  return (
    <div suppressHydrationWarning>
      {/* ENHANCED HEADER: Shows user welcome message and current date */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Employee Management Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {currentUser?.name} • {currentUser?.role} Access
          </p>
        </div>
        <div className="text-right">
          <span className="text-gray-500 block">Today: {currentDate}</span>
          {refreshing && (
            <span className="text-sm text-blue-500">Updating data...</span>
          )}
        </div>
      </div>

      {/* ENHANCED ALERT SYSTEM: Role-based alert cards for urgent notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* IT SETUP ALERT: Shown to Admin and IT when new employees need equipment */}
        {isAdminOrIT && newEmployeesCount > 0 && (
          <Link href="/management-portal/onboarding">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors cursor-pointer">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-800">
                    IT Setup Required
                  </h3>
                  <p className="text-amber-700">
                    {newEmployeesCount} new employee
                    {newEmployeesCount !== 1 ? "s" : ""} need equipment
                    assignment
                  </p>
                </div>
                <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {newEmployeesCount}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ROLE APPROVAL ALERT: Shown to Admin and IT when approval requests exist */}
        {canManageApprovals && (stats.pendingApprovals || 0) > 0 && (
          <Link href="/management-portal/admin/approvals">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-800">
                    Pending Role Approvals
                  </h3>
                  <p className="text-blue-700">
                    {stats.pendingApprovals} role upgrade request
                    {stats.pendingApprovals !== 1 ? "s" : ""} awaiting review
                  </p>
                </div>
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {stats.pendingApprovals}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* OVERDUE RETURNS ALERT: Shown to IT staff for equipment compliance */}
        {isIT && (stats.overdueReturns || 0) > 0 && (
          <Link href="/management-portal/terminations?filter=overdue">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors cursor-pointer">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800">
                    Overdue Equipment Returns
                  </h3>
                  <p className="text-red-700">
                    {stats.overdueReturns} return
                    {stats.overdueReturns !== 1 ? "s" : ""} past 30-day deadline
                  </p>
                </div>
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {stats.overdueReturns}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* TRAINING COMPLETION ALERT: Shown to Trainers and HR for performance tracking */}
        {(isTrainer || isHR) && (
          <Link href="/management-portal/reports?view=training">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors cursor-pointer">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800">
                    Training Overview
                  </h3>
                  <p className="text-green-700">
                    {stats.completionRate || 0}% average completion rate
                  </p>
                </div>
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  View
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ENHANCED STATISTICS SECTION: Dynamic metric cards with role-based filtering */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Key Metrics {currentUser?.role && `• ${currentUser.role} View`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            /**
             * Card Content: Reusable card component for each statistic
             * Includes icon, value, label, description, and role badge if restricted
             */
            const cardContent = (
              <div
                className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${stat.color.replace(
                  "text-",
                  "border-"
                )} ${
                  stat.link
                    ? "hover:shadow-md transition-shadow cursor-pointer"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <IconComponent className={`h-8 w-8 ${stat.color} mb-2`} />
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {stat.label}
                    </div>
                    {stat.description && (
                      <div className="text-xs text-gray-500 mt-1">
                        {stat.description}
                      </div>
                    )}
                  </div>
                  {stat.roleRestricted && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {currentUser?.role}
                    </span>
                  )}
                </div>
              </div>
            );

            /**
             * Render card as link if navigation is provided
             * Otherwise render as static card
             */
            return stat.link ? (
              <Link key={index} href={stat.link}>
                {cardContent}
              </Link>
            ) : (
              <div key={index}>{cardContent}</div>
            );
          })}
        </div>
      </div>

      {/* ENHANCED ACTIVITY SECTIONS: Recent activities and quick actions sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* RECENT ACTIVITY: Main activity feed showing system events */}
        <div className="bg-white rounded-lg shadow-sm p-6 xl:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {activities.recentActivities.slice(0, 8).map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {activity.employee}
                  </div>
                  <div className="text-sm text-gray-600">
                    {activity.activity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{activity.date}</div>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${
                      activity.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : activity.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : activity.status === "warning"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {activities.recentActivities.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No recent activity
            </div>
          )}
        </div>

        {/* QUICK ACTIONS & PENDING ITEMS: Sidebar with actionable items and navigation */}
        <div className="space-y-6">
          {/* PENDING ACTIONS: Critical items requiring immediate attention */}
          {activities.pendingActions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Requires Attention
              </h3>
              <div className="space-y-2">
                {activities.pendingActions.slice(0, 5).map((action, index) => (
                  <Link key={index} href={action.link || "#"} className="block">
                    <div className="p-2 border border-orange-200 bg-orange-50 rounded hover:bg-orange-100 transition-colors">
                      <div className="text-sm font-medium text-orange-800">
                        {action.activity}
                      </div>
                      <div className="text-xs text-orange-600">
                        {action.employee} • {action.date}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ROLE-SPECIFIC QUICK LINKS: Contextual navigation based on user role */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {/* COMMON ACTIONS: Available to all users */}
              <Link href="/management-portal/onboarding" className="block">
                <div className="p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">
                    Add New Employee
                  </div>
                  <div className="text-sm text-gray-600">
                    Start onboarding process
                  </div>
                </div>
              </Link>

              {/* ROLE-SPECIFIC QUICK ACTIONS: Conditionally shown based on permissions */}
              {canManageApprovals && (
                <Link
                  href="/management-portal/admin/approvals"
                  className="block"
                >
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                    <div className="font-medium text-blue-900">
                      Review Role Requests
                    </div>
                    <div className="text-sm text-blue-600">
                      Manage user permissions
                    </div>
                  </div>
                </Link>
              )}

              {isIT && (
                <Link href="/management-portal/it-assets" className="block">
                  <div className="p-3 border border-yellow-200 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors">
                    <div className="font-medium text-yellow-900">
                      Manage IT Assets
                    </div>
                    <div className="text-sm text-yellow-600">
                      Laptop inventory & assignments
                    </div>
                  </div>
                </Link>
              )}

              {/* {canViewReports && (
                <Link href="/management-portal/reports" className="block">
                  <div className="p-3 border border-purple-200 bg-purple-50 rounded hover:bg-purple-100 transition-colors">
                    <div className="font-medium text-purple-900">
                      View Reports
                    </div>
                    <div className="text-sm text-purple-600">
                      Analytics & insights
                    </div>
                  </div>
                </Link>
              )} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

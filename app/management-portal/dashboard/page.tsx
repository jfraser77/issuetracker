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
  XMarkIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { StatItem, ActivityItem } from "../types";
import Link from "next/link";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface DashboardStats {
  totalEmployees: number;
  newThisMonth: number;
  pendingTerminations: number;
  availableLaptops: number;
  pendingApprovals?: number;
  archivedCount?: number;
  completionRate?: number;
  overdueReturns?: number;
  onboardingProgress?: number;
  terminationProgress?: number;
}

interface DashboardActivities {
  recentActivities: ActivityItem[];
  pendingActions: ActivityItem[];
  systemAlerts: ActivityItem[];
}

interface AlertItem {
  id: string;
  type: "onboarding" | "termination" | "system";
  title: string;
  message: string;
  progress?: number;
  status: "in-progress" | "completed" | "pending";
  timestamp: string;
  viewed: boolean;
  link: string;
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    newThisMonth: 0,
    pendingTerminations: 0,
    availableLaptops: 0,
    pendingApprovals: 0,
    archivedCount: 0,
    completionRate: 0,
    overdueReturns: 0,
    onboardingProgress: 0,
    terminationProgress: 0,
  });
  const [activities, setActivities] = useState<DashboardActivities>({
    recentActivities: [],
    pendingActions: [],
    systemAlerts: [],
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [newEmployeesCount, setNewEmployeesCount] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
    fetchDashboardData();
    fetchNewEmployeesCount();
    fetchAlerts();

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNewEmployeesCount();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isClient) {
      const saved = localStorage.getItem("dismissedAlerts");
      if (saved) {
        setDismissedAlerts(new Set(JSON.parse(saved)));
      }
    }
  }, [isClient]);

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

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activities"),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

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

  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/dashboard/alerts");
      if (response.ok) {
        const alertsData = await response.json();
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const markAlertAsViewed = async (alertId: string) => {
    try {
      // Update local state immediately
      setDismissedAlerts((prev) => {
        const newSet = new Set(prev);
        newSet.add(alertId);
        localStorage.setItem("dismissedAlerts", JSON.stringify([...newSet]));
        return newSet;
      });

      // Update in database (fire and forget)
      fetch(`/api/dashboard/alerts/${alertId}/view`, {
        method: "POST",
      }).catch((error) => {
        console.error("Background alert update failed:", error);
      });
    } catch (error) {
      console.error("Error marking alert as viewed:", error);
    }
  };

  const isAdmin = currentUser?.role === "Admin";
  const isIT = currentUser?.role === "I.T.";
  const isHR = currentUser?.role === "HR";
  const isTrainer = currentUser?.role === "Trainer";
  const isAdminOrIT = isAdmin || isIT;
  const canManageUsers = isAdmin || isHR;
  const canViewReports = isAdmin || isIT || isHR;
  const canManageApprovals = isAdmin || isIT;

  // Filter alerts for Trainer, HR, and Admin roles
  const visibleAlerts = alerts.filter(
    (alert) =>
      (isTrainer || isHR || isAdmin) &&
      !alert.viewed &&
      !dismissedAlerts.has(alert.id)
  );

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg dark:text-white">Loading dashboard...</div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statCards: (StatItem & {
    link?: string;
    description?: string;
    roleRestricted?: boolean;
  })[] = [
    {
      icon: UserPlusIcon,
      value: stats.newThisMonth,
      label: "New This Month",
      color: "text-green-500 dark:text-green-400",
      link: "/management-portal/onboarding",
      description: "Employees added this month",
    },
    {
      icon: UserMinusIcon,
      value: stats.pendingTerminations,
      label: "Pending Terminations",
      color: "text-red-500 dark:text-red-400",
      link: "/management-portal/terminations",
      description: "Terminations in progress",
    },
    {
      icon: ChartBarIcon,
      value: `${stats.onboardingProgress || 0}%`,
      label: "Onboarding Progress",
      color: "text-blue-500 dark:text-blue-400",
      link: "/management-portal/onboarding",
      description: "Average completion rate",
    },

    ...(isAdminOrIT
      ? [
          {
            icon: ComputerDesktopIcon,
            value: stats.availableLaptops,
            label: "Available Laptops",
            color: "text-yellow-500 dark:text-yellow-400",
            link: "/management-portal/it-assets",
            description: "Laptops ready for assignment",
            roleRestricted: true,
          },
        ]
      : []),

    ...(isAdmin
      ? [
          {
            icon: ClockIcon,
            value: stats.pendingApprovals || 0,
            label: "Pending Approvals",
            color: "text-orange-500 dark:text-orange-400",
            link: "/management-portal/admin/approvals",
            description: "Role upgrade requests",
            roleRestricted: true,
          },
        ]
      : []),

    ...(canViewReports
      ? [
          {
            icon: ArchiveBoxIcon,
            value: stats.archivedCount || 0,
            label: "Archived Records",
            color: "text-purple-500 dark:text-purple-400",
            link: "/management-portal/onboarding/archived",
            description: "Completed processes",
            roleRestricted: true,
          },
        ]
      : []),
  ];

  return (
    <div suppressHydrationWarning>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Employee Management Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Welcome back, {currentUser?.name} • {currentUser?.role} Access
          </p>
        </div>
        <div className="text-right">
          <span className="text-gray-500 dark:text-gray-400 block">
            Today: {currentDate}
          </span>
          {refreshing && (
            <span className="text-sm text-blue-500 dark:text-blue-400">
              Updating data...
            </span>
          )}
        </div>
      </div>

      {/* Enhanced Alert System with Progress Tracking */}
      {(isTrainer || isHR || isAdmin) && visibleAlerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 transition-colors relative ${
                alert.status === "completed"
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : alert.status === "in-progress"
                  ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {alert.status === "completed" ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                    ) : alert.status === "in-progress" ? (
                      <ClockIcon className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-2" />
                    )}
                    <h3
                      className={`text-lg font-semibold ${
                        alert.status === "completed"
                          ? "text-green-800 dark:text-green-300"
                          : alert.status === "in-progress"
                          ? "text-blue-800 dark:text-blue-300"
                          : "text-amber-800 dark:text-amber-300"
                      }`}
                    >
                      {alert.title}
                    </h3>
                  </div>
                  <p
                    className={`text-sm mb-3 ${
                      alert.status === "completed"
                        ? "text-green-700 dark:text-green-400"
                        : alert.status === "in-progress"
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {alert.message}
                  </p>

                  {alert.progress !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span
                          className={
                            alert.status === "completed"
                              ? "text-green-600 dark:text-green-400"
                              : alert.status === "in-progress"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          Progress
                        </span>
                        <span
                          className={
                            alert.status === "completed"
                              ? "text-green-600 dark:text-green-400"
                              : alert.status === "in-progress"
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {alert.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            alert.status === "completed"
                              ? "bg-green-500 dark:bg-green-400"
                              : alert.status === "in-progress"
                              ? "bg-blue-500 dark:bg-blue-400"
                              : "bg-amber-500 dark:bg-amber-400"
                          }`}
                          style={{ width: `${alert.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <Link
                      href={alert.link}
                      className={`text-sm font-medium px-3 py-1 rounded ${
                        alert.status === "completed"
                          ? "bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500"
                          : alert.status === "in-progress"
                          ? "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500"
                          : "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500"
                      }`}
                    >
                      View Details
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => markAlertAsViewed(alert.id)}
                  className="ml-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  title="Mark as viewed"
                >
                  <EyeIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Alert System for IT Setup and Other Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {isAdminOrIT && newEmployeesCount > 0 && (
          <Link href="/management-portal/onboarding">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors cursor-pointer dark:bg-amber-900/20 dark:border-amber-800 dark:hover:bg-amber-900/30">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 dark:text-amber-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                    IT Setup Required
                  </h3>
                  <p className="text-amber-700 dark:text-amber-400">
                    {newEmployeesCount} new employee
                    {newEmployeesCount !== 1 ? "s" : ""} need equipment
                    assignment
                  </p>
                </div>
                <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-medium dark:bg-amber-600">
                  {newEmployeesCount}
                </div>
              </div>
            </div>
          </Link>
        )}

        {canManageApprovals && (stats.pendingApprovals || 0) > 0 && (
          <Link href="/management-portal/admin/approvals">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors cursor-pointer dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-500 dark:text-blue-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                    Pending Role Approvals
                  </h3>
                  <p className="text-blue-700 dark:text-blue-400">
                    {stats.pendingApprovals} role upgrade request
                    {stats.pendingApprovals !== 1 ? "s" : ""} awaiting review
                  </p>
                </div>
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium dark:bg-blue-600">
                  {stats.pendingApprovals}
                </div>
              </div>
            </div>
          </Link>
        )}

        {isIT && (stats.overdueReturns || 0) > 0 && (
          <Link href="/management-portal/terminations?filter=overdue">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors cursor-pointer dark:bg-red-900/20 dark:border-red-800 dark:hover:bg-red-900/30">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 dark:text-red-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                    Overdue Equipment Returns
                  </h3>
                  <p className="text-red-700 dark:text-red-400">
                    {stats.overdueReturns} return
                    {stats.overdueReturns !== 1 ? "s" : ""} past 30-day deadline
                  </p>
                </div>
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium dark:bg-red-600">
                  {stats.overdueReturns}
                </div>
              </div>
            </div>
          </Link>
        )}

        {(isTrainer || isHR) && (
          <Link href="/management-portal/reports?view=training">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors cursor-pointer dark:bg-green-900/20 dark:border-green-800 dark:hover:bg-green-900/30">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500 dark:text-green-400 mr-3" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                    Training Overview
                  </h3>
                  <p className="text-green-700 dark:text-green-400">
                    {stats.completionRate || 0}% average completion rate
                  </p>
                </div>
                <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium dark:bg-green-600">
                  View
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Enhanced Statistics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Key Metrics {currentUser?.role && `• ${currentUser.role} View`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            const cardContent = (
              <div
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-l-4 ${stat.color.replace(
                  "text-",
                  "border-"
                )} ${
                  stat.link
                    ? "hover:shadow-md transition-shadow cursor-pointer dark:hover:shadow-lg dark:hover:shadow-gray-900/20"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <IconComponent className={`h-8 w-8 ${stat.color} mb-2`} />
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.label}
                    </div>
                    {stat.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {stat.description}
                      </div>
                    )}
                  </div>
                  {stat.roleRestricted && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                      {currentUser?.role}
                    </span>
                  )}
                </div>
              </div>
            );

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

      {/* Enhanced Activity Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Activity with Onboarding/Termination Updates */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 xl:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {activities.recentActivities.slice(0, 8).map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {activity.employee}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {activity.activity}
                  </div>
                  {activity.department && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.department}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.date}
                  </div>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ${
                      activity.status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        : activity.status === "pending"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"
                        : activity.status === "warning"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {activities.recentActivities.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              No recent activity
            </div>
          )}
        </div>

        {/* Quick Actions & Pending Items */}
        <div className="space-y-6">
          {/* Enhanced Requires Attention Section */}
          {(activities.pendingActions.length > 0 ||
            visibleAlerts.length > 0) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Requires Attention
              </h3>
              <div className="space-y-2">
                {activities.pendingActions.slice(0, 3).map((action, index) => (
                  <Link key={index} href={action.link || "#"} className="block">
                    <div className="p-2 border border-orange-200 bg-orange-50 rounded hover:bg-orange-100 transition-colors dark:border-orange-800 dark:bg-orange-900/20 dark:hover:bg-orange-900/30">
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        {action.activity}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        {action.employee} • {action.date}
                      </div>
                    </div>
                  </Link>
                ))}
                {visibleAlerts.slice(0, 2).map((alert) => (
                  <Link key={alert.id} href={alert.link} className="block">
                    <div
                      className={`p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        alert.status === "completed"
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                          : alert.status === "in-progress"
                          ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium ${
                          alert.status === "completed"
                            ? "text-green-800 dark:text-green-300"
                            : alert.status === "in-progress"
                            ? "text-blue-800 dark:text-blue-300"
                            : "text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {alert.title}
                      </div>
                      <div
                        className={`text-xs ${
                          alert.status === "completed"
                            ? "text-green-600 dark:text-green-400"
                            : alert.status === "in-progress"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {alert.progress
                          ? `${alert.progress}% complete`
                          : "Action required"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Enhanced Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/management-portal/onboarding" className="block">
                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Add New Employee
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Start onboarding process
                  </div>
                </div>
              </Link>

              <Link href="/management-portal/terminations" className="block">
                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="font-medium text-gray-900 dark:text-white">
                    Process Termination
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Initiate employee offboarding
                  </div>
                </div>
              </Link>

              {canManageApprovals && (
                <Link
                  href="/management-portal/admin/approvals"
                  className="block"
                >
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30">
                    <div className="font-medium text-blue-900 dark:text-blue-300">
                      Review Role Requests
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">
                      Manage user permissions
                    </div>
                  </div>
                </Link>
              )}

              {isIT && (
                <Link href="/management-portal/it-assets" className="block">
                  <div className="p-3 border border-yellow-200 bg-yellow-50 rounded hover:bg-yellow-100 transition-colors dark:border-yellow-800 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30">
                    <div className="font-medium text-yellow-900 dark:text-yellow-300">
                      Manage IT Assets
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      Laptop inventory & assignments
                    </div>
                  </div>
                </Link>
              )}

              {(isTrainer || isHR) && (
                <Link href="/management-portal/reports" className="block">
                  <div className="p-3 border border-purple-200 bg-purple-50 rounded hover:bg-purple-100 transition-colors dark:border-purple-800 dark:bg-purple-900/20 dark:hover:bg-purple-900/30">
                    <div className="font-medium text-purple-900 dark:text-purple-300">
                      Training Reports
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">
                      View completion analytics
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

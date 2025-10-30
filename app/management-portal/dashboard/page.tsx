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
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
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
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [activityLimit, setActivityLimit] = useState(5);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Enhanced alert dismissal with session persistence
  useEffect(() => {
    setIsClient(true);
    fetchCurrentUser();
    fetchDashboardData();
    fetchNewEmployeesCount();
    fetchAlerts();

    // Load dismissed alerts from sessionStorage (clears on browser close)
    const saved = sessionStorage.getItem('dismissedAlerts');
    if (saved) {
      setDismissedAlerts(new Set(JSON.parse(saved)));
    }

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchNewEmployeesCount();
      fetchAlerts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

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
      fetch(`/api/dashboard/activities?role=${currentUser?.role}&limit=20`), // Added role and limit
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
    const response = await fetch(`/api/dashboard/alerts?role=${currentUser?.role}`);
    if (response.ok) {
      const alertsData = await response.json();
      setAlerts(alertsData);
    }
  } catch (error) {
    console.error("Error fetching alerts:", error);
  }
};

  // Enhanced alert dismissal with sessionStorage
  const markAlertAsViewed = async (alertId: string) => {
    try {
      // Update local state immediately using sessionStorage
      setDismissedAlerts(prev => {
        const newSet = new Set(prev);
        newSet.add(alertId);
        sessionStorage.setItem('dismissedAlerts', JSON.stringify([...newSet]));
        return newSet;
      });

      // Update in database (fire and forget)
      fetch(`/api/dashboard/alerts/${alertId}/view`, {
        method: "POST",
      }).catch(error => {
        console.error("Background alert update failed:", error);
      });
      
    } catch (error) {
      console.error("Error marking alert as viewed:", error);
    }
  };

  // Clear all dismissed alerts (on sign out or manually)
  const clearDismissedAlerts = () => {
    setDismissedAlerts(new Set());
    sessionStorage.removeItem('dismissedAlerts');
  };

  const isAdmin = currentUser?.role === "Admin";
  const isIT = currentUser?.role === "I.T.";
  const isHR = currentUser?.role === "HR";
  const isTrainer = currentUser?.role === "Trainer";
  const isAdminOrIT = isAdmin || isIT;
  const canManageUsers = isAdmin || isHR;
  const canViewReports = isAdmin || isIT || isHR;
  const canManageApprovals = isAdmin || isIT;

  // Enhanced alert filtering with session-based dismissal
  const visibleAlerts = alerts.filter(
    (alert) => 
      (isTrainer || isHR || isAdmin) && 
      !alert.viewed && 
      !dismissedAlerts.has(alert.id)
  );

  // Enhanced activity management
  const displayedActivities = showAllActivities 
    ? activities.recentActivities 
    : activities.recentActivities.slice(0, activityLimit);

  const toggleActivityView = () => {
    setShowAllActivities(!showAllActivities);
  };

  const loadMoreActivities = () => {
    setActivityLimit(prev => prev + 5);
  };

  if (!isClient) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg">Loading dashboard...</div>
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
    {
      icon: ChartBarIcon,
      value: `${stats.onboardingProgress || 0}%`,
      label: "Onboarding Progress",
      color: "text-blue-500",
      link: "/management-portal/onboarding",
      description: "Average completion rate",
    },

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

    ...(canViewReports
      ? [
          {
            icon: ArchiveBoxIcon,
            value: stats.archivedCount || 0,
            label: "Archived Records",
            color: "text-purple-500",
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
          <h1 className="text-2xl font-bold text-gray-800">
            Employee Management Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {currentUser?.name} • {currentUser?.role} Access
          </p>
        </div>
        <div className="text-right flex items-center gap-4">
          <span className="text-gray-500 block">Today: {currentDate}</span>
          {refreshing && (
            <div className="flex items-center text-sm text-blue-500">
              <ArrowPathIcon className="h-4 w-4 animate-spin mr-1" />
              Updating data...
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Alert System with Improved Dismissal */}
      {(isTrainer || isHR || isAdmin) && visibleAlerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 transition-all duration-300 relative ${
                alert.status === "completed"
                  ? "bg-green-50 border-green-200 hover:border-green-300"
                  : alert.status === "in-progress"
                  ? "bg-blue-50 border-blue-200 hover:border-blue-300"
                  : "bg-amber-50 border-amber-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {alert.status === "completed" ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    ) : alert.status === "in-progress" ? (
                      <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mr-2" />
                    )}
                    <h3
                      className={`text-lg font-semibold ${
                        alert.status === "completed"
                          ? "text-green-800"
                          : alert.status === "in-progress"
                          ? "text-blue-800"
                          : "text-amber-800"
                      }`}
                    >
                      {alert.title}
                    </h3>
                  </div>
                  <p
                    className={`text-sm mb-3 ${
                      alert.status === "completed"
                        ? "text-green-700"
                        : alert.status === "in-progress"
                        ? "text-blue-700"
                        : "text-amber-700"
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
                              ? "text-green-600"
                              : alert.status === "in-progress"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }
                        >
                          Progress
                        </span>
                        <span
                          className={
                            alert.status === "completed"
                              ? "text-green-600"
                              : alert.status === "in-progress"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }
                        >
                          {alert.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            alert.status === "completed"
                              ? "bg-green-500"
                              : alert.status === "in-progress"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${alert.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <Link
                      href={alert.link}
                      className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                        alert.status === "completed"
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : alert.status === "in-progress"
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-amber-500 text-white hover:bg-amber-600"
                      }`}
                    >
                      View Details
                    </Link>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => markAlertAsViewed(alert.id)}
                  className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:bg-amber-100 transition-colors cursor-pointer group">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-amber-500 mr-3 group-hover:scale-110 transition-transform" />
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

        {canManageApprovals && (stats.pendingApprovals || 0) > 0 && (
          <Link href="/management-portal/admin/approvals">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 transition-colors cursor-pointer group">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-500 mr-3 group-hover:scale-110 transition-transform" />
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

        {isIT && (stats.overdueReturns || 0) > 0 && (
          <Link href="/management-portal/terminations?filter=overdue">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors cursor-pointer group">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3 group-hover:scale-110 transition-transform" />
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

        {(isTrainer || isHR) && (
          <Link href="/management-portal/reports?view=training">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors cursor-pointer group">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3 group-hover:scale-110 transition-transform" />
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

      {/* Enhanced Statistics Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Key Metrics {currentUser?.role && `• ${currentUser.role} View`}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            const cardContent = (
              <div
                className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${stat.color.replace(
                  "text-",
                  "border-"
                )} ${
                  stat.link
                    ? "hover:shadow-md transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
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
        {/* Modern Recent Activity Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 xl:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Activity
            </h2>
            {activities.recentActivities.length > 5 && (
              <button
                onClick={toggleActivityView}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {showAllActivities ? (
                  <>
                    <ChevronUpIcon className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-4 w-4" />
                    Show All ({activities.recentActivities.length})
                  </>
                )}
              </button>
            )}
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {displayedActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === "completed"
                      ? "bg-green-500"
                      : activity.status === "pending"
                      ? "bg-yellow-500"
                      : activity.status === "warning"
                      ? "bg-orange-500"
                      : "bg-gray-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {activity.employee}
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {activity.activity}
                    </div>
                    {activity.department && (
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.department}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    {activity.date}
                  </div>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full whitespace-nowrap ${
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
              <div className="text-lg mb-2">No recent activity</div>
              <div className="text-sm">Activity will appear here as processes are completed</div>
            </div>
          )}
          
          {!showAllActivities && activities.recentActivities.length > activityLimit && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMoreActivities}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Load More Activities
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions & Pending Items */}
        <div className="space-y-6">
          {/* Enhanced Requires Attention Section */}
          {(activities.pendingActions.length > 0 ||
            visibleAlerts.length > 0) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Requires Attention
                </h3>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                  {activities.pendingActions.length + visibleAlerts.length}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {activities.pendingActions.slice(0, 3).map((action, index) => (
                  <Link key={index} href={action.link || "#"} className="block">
                    <div className="p-3 border border-orange-200 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group">
                      <div className="text-sm font-medium text-orange-800 group-hover:text-orange-900">
                        {action.activity}
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        {action.employee} • {action.date}
                      </div>
                    </div>
                  </Link>
                ))}
                {visibleAlerts.slice(0, 2).map((alert) => (
                  <Link key={alert.id} href={alert.link} className="block">
                    <div
                      className={`p-3 border rounded-lg hover:shadow-sm transition-all group ${
                        alert.status === "completed"
                          ? "border-green-200 bg-green-50 hover:bg-green-100"
                          : alert.status === "in-progress"
                          ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
                          : "border-amber-200 bg-amber-50 hover:bg-amber-100"
                      }`}
                    >
                      <div
                        className={`text-sm font-medium group-hover:underline ${
                          alert.status === "completed"
                            ? "text-green-800"
                            : alert.status === "in-progress"
                            ? "text-blue-800"
                            : "text-amber-800"
                        }`}
                      >
                        {alert.title}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          alert.status === "completed"
                            ? "text-green-600"
                            : alert.status === "in-progress"
                            ? "text-blue-600"
                            : "text-amber-600"
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
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/management-portal/onboarding" className="block">
                <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600">
                    Add New Employee
                  </div>
                  <div className="text-sm text-gray-600">
                    Start onboarding process
                  </div>
                </div>
              </Link>

              <Link href="/management-portal/terminations" className="block">
                <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="font-medium text-gray-900 group-hover:text-red-600">
                    Process Termination
                  </div>
                  <div className="text-sm text-gray-600">
                    Initiate employee offboarding
                  </div>
                </div>
              </Link>

              {canManageApprovals && (
                <Link
                  href="/management-portal/admin/approvals"
                  className="block"
                >
                  <div className="p-3 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group">
                    <div className="font-medium text-blue-900 group-hover:text-blue-700">
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
                  <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group">
                    <div className="font-medium text-yellow-900 group-hover:text-yellow-700">
                      Manage IT Assets
                    </div>
                    <div className="text-sm text-yellow-600">
                      Laptop inventory & assignments
                    </div>
                  </div>
                </Link>
              )}

              {(isTrainer || isHR) && (
                <Link href="/management-portal/reports" className="block">
                  <div className="p-3 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group">
                    <div className="font-medium text-purple-900 group-hover:text-purple-700">
                      Training Reports
                    </div>
                    <div className="text-sm text-purple-600">
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
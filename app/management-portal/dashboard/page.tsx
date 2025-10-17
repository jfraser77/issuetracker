// app/dashboard/page.tsx
"use client";

import {
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { StatItem, ActivityItem } from "../types";
import Link from "next/link";
import { useState, useEffect } from "react";

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
}

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    newThisMonth: 0,
    pendingTerminations: 0,
    availableLaptops: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newEmployeesCount, setNewEmployeesCount] = useState(0);
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchDashboardData();
    fetchNewEmployeesCount();
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
    try {
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activities")
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

  const isAdminOrIT = currentUser?.role === "Admin" || currentUser?.role === "I.T.";
  const isHR = currentUser?.role === "HR";

  const statCards: (StatItem & { link?: string })[] = [
    // Total Employees card hidden but available in codebase
    // {
    //   icon: UsersIcon,
    //   value: stats.totalEmployees,
    //   label: "Total Employees",
    //   color: "text-blue-500",
    // },
    {
      icon: UserPlusIcon,
      value: stats.newThisMonth,
      label: "New This Month",
      color: "text-green-500",
      link: "/management-portal/onboarding",
    },
    {
      icon: UserMinusIcon,
      value: stats.pendingTerminations,
      label: "Pending Terminations",
      color: "text-red-500",
      link: "/management-portal/terminations",
    },
    {
      icon: ComputerDesktopIcon,
      value: stats.availableLaptops,
      label: "Available Laptops",
      color: "text-yellow-500",
      link: isAdminOrIT ? "/management-portal/it-assets" : undefined,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Employee Management Dashboard
        </h1>
        <span className="text-gray-500">Today: {currentDate}</span>
      </div>

      {/* Alert Card for IT Setup - Only for Admin/IT */}
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

      {/* Alert Card for Overdue Equipment Returns */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          const cardContent = (
            <div className={`bg-white rounded-lg shadow-sm p-6 ${stat.link ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
              <IconComponent className={`h-8 w-8 ${stat.color} mb-4`} />
              <div className="text-3xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          );

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

      {/* Recent Activity */}
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
import {
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { StatItem, ActivityItem } from "../types";

export default function Dashboard() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats: StatItem[] = [
    {
      icon: UsersIcon,
      value: 247,
      label: "Total Employees",
      color: "text-blue-500",
    },
    {
      icon: UserPlusIcon,
      value: 12,
      label: "New This Month",
      color: "text-green-500",
    },
    {
      icon: UserMinusIcon,
      value: 5,
      label: "Pending Terminations",
      color: "text-red-500",
    },
    {
      icon: ComputerDesktopIcon,
      value: 18,
      label: "Available Laptops",
      color: "text-yellow-500",
    },
  ];

  const activities: ActivityItem[] = [
    {
      employee: "Sarah Johnson",
      department: "Marketing",
      activity: "Onboarding",
      date: "Sep 15, 2023",
      status: "completed",
    },
    {
      employee: "Michael Chen",
      department: "Engineering",
      activity: "Termination",
      date: "Sep 14, 2023",
      status: "pending",
    },
    {
      employee: "Emily Williams",
      department: "Sales",
      activity: "Onboarding",
      date: "Sep 14, 2023",
      status: "warning",
    },
    {
      employee: "David Brown",
      department: "HR",
      activity: "Termination",
      date: "Sep 13, 2023",
      status: "completed",
    },
    {
      employee: "Lisa Rodriguez",
      department: "Finance",
      activity: "Onboarding",
      date: "Sep 12, 2023",
      status: "completed",
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <IconComponent className={`h-8 w-8 ${stat.color} mb-4`} />
              <div className="text-3xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500">{stat.label}</div>
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

"use client";

import { useState } from "react";
import {
  ComputerDesktopIcon,
  ArrowPathIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

interface ITStaff {
  id: number;
  name: string;
  role: string;
  image: string;
  total: number;
  available: number;
  inUse: number;
}

interface LaptopSetupItem {
  id: string;
  model: string;
  specs: string;
  status: string;
  assignedTo: string;
  itStaff: string;
  newHire: string;
}

export default function ITAssets() {
  // Initial IT staff data
  const initialItStaff: ITStaff[] = [
    {
      id: 1,
      name: "Joe Fraser",
      role: "Sys Admin",
      image: "https://randommer.io/images/cartoons/IG-88.webp",
      total: 8,
      available: 5,
      inUse: 3,
    },
    {
      id: 2,
      name: "Lauren Ingignoli",
      role: "IT Support Specialist",
      image: "https://ca.slack-edge.com/T0RU90MG9-U07SXB7HS2Y-d860e8906469-512",
      total: 6,
      available: 3,
      inUse: 3,
    },
    {
      id: 3,
      name: "Zach Vollono",
      role: "IT Support Specialist",
      image: "https://ca.slack-edge.com/T0RU90MG9-U05KY1LUMMF-3cd06e2bfa2c-512",
      total: 7,
      available: 2,
      inUse: 5,
    },
  ];

  const [itStaff, setItStaff] = useState<ITStaff[]>(initialItStaff);

  const laptopSetup: LaptopSetupItem[] = [
    {
      id: "LT-1045",
      model: "Dell XPS 13",
      specs: "i7, 16GB RAM, 512GB SSD",
      status: "setup",
      assignedTo: "Jennifer Lopez",
      itStaff: "Alex Johnson",
      newHire: "Robert Kim",
    },
    {
      id: "LT-1046",
      model: 'MacBook Pro 16"',
      specs: "M2 Pro, 32GB RAM, 1TB SSD",
      status: "ready",
      assignedTo: "Thomas Wright",
      itStaff: "Michael Chen",
      newHire: "Marketing",
    },
    {
      id: "LT-1047",
      model: "ThinkPad X1 Carbon",
      specs: "i5, 8GB RAM, 256GB SSD",
      status: "setup",
      assignedTo: "Amanda Lewis",
      itStaff: "Michael Chen",
      newHire: "Sales",
    },
    {
      id: "LT-1048",
      model: "HP EliteBook",
      specs: "i7, 16GB RAM, 512GB SSD",
      status: "ready",
      assignedTo: "David Brown",
      itStaff: "Sarah Williams",
      newHire: "Finance",
    },
  ];

  const stats = [
    {
      icon: ComputerDesktopIcon,
      value: 142,
      label: "Assigned Laptops",
      color: "text-blue-500",
    },
    {
      icon: ComputerDesktopIcon,
      value: 18,
      label: "Available Laptops",
      color: "text-green-500",
    },
    {
      icon: ArrowPathIcon,
      value: 2,
      label: "Pending Return",
      color: "text-red-500",
    },
  ];

  const getStatusClass = (status: string): string => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-800";
      case "setup":
        return "bg-amber-100 text-amber-800";
      case "maintenance":
        return "bg-amber-100 text-amber-800";
      case "assigned":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "ready":
        return "Ready for New Hire";
      case "setup":
        return "In Setup";
      case "maintenance":
        return "Maintenance";
      case "assigned":
        return "Assigned";
      default:
        return "Pending";
    }
  };

  // Function to increase total laptops
  const increaseTotal = (id: number): void => {
    setItStaff((prevStaff) =>
      prevStaff.map((staff) =>
        staff.id === id
          ? { ...staff, total: staff.total + 1, available: staff.available + 1 }
          : staff
      )
    );
  };

  // Function to decrease total laptops
  const decreaseTotal = (id: number): void => {
    setItStaff((prevStaff) =>
      prevStaff.map((staff) =>
        staff.id === id && staff.total > 0
          ? {
              ...staff,
              total: staff.total - 1,
              available: Math.max(0, staff.available - 1),
              inUse: Math.max(0, staff.inUse - (staff.available > 0 ? 0 : 1)),
            }
          : staff
      )
    );
  };

  // Function to refresh inventory (simulate new inventory)
  const refreshInventory = (): void => {
    setItStaff((prevStaff) =>
      prevStaff.map((staff) => ({
        ...staff,
        total: staff.total + Math.floor(Math.random() * 3),
        available: staff.available + Math.floor(Math.random() * 2),
        inUse: staff.inUse,
      }))
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          IT Staff Laptop Inventory
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

      {/* IT Staff Inventory */}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          IT Staff Inventory
        </h2>
        <button
          onClick={refreshInventory}
          className="btn btn-primary flex items-center"
        >
          <ArrowPathIcon className="h-5 w-5 mr-2" />
          Refresh Inventory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {itStaff.map((staff) => (
          <div
            key={staff.id}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4 pb-4 border-b border-gray-100">
              <img
                src={staff.image}
                alt={staff.name}
                className="w-14 h-14 rounded-full object-cover mr-4"
              />
              <div>
                <h3 className="font-semibold text-gray-900">{staff.name}</h3>
                <p className="text-sm text-gray-500">{staff.role}</p>
              </div>
            </div>

            <div className="flex justify-around text-center mb-4">
              <div className="px-4 py-2">
                <span className="block text-2xl font-bold text-gray-900">
                  {staff.total}
                </span>
                <span className="text-xs text-gray-500">Total</span>
              </div>
              <div className="px-4 py-2">
                <span className="block text-2xl font-bold text-gray-900">
                  {staff.available}
                </span>
                <span className="text-xs text-gray-500">Available</span>
              </div>
              <div className="px-4 py-2">
                <span className="block text-2xl font-bold text-gray-900">
                  {staff.inUse}
                </span>
                <span className="text-xs text-gray-500">In Use</span>
              </div>
            </div>

            {/* Buttons to adjust total inventory */}
            <div className="flex justify-between mt-4">
              <button
                onClick={() => decreaseTotal(staff.id)}
                disabled={staff.total <= 0}
                className={`flex items-center px-3 py-2 rounded-md font-medium ${
                  staff.total <= 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                <MinusIcon className="h-4 w-4 mr-1" />-
              </button>
              <button
                onClick={() => increaseTotal(staff.id)}
                className="flex items-center px-3 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600"
              >
                <PlusIcon className="h-4 w-4 mr-1" />+
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Laptop New Hire Setup Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Laptop New Hire Setup
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laptop ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New Hire Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IT Staff
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {laptopSetup.map((laptop, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {laptop.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {laptop.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {laptop.specs}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClass(
                        laptop.status
                      )}`}
                    >
                      {getStatusText(laptop.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {laptop.assignedTo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {laptop.newHire}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {laptop.itStaff}
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

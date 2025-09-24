"use client";

import { useState, useMemo } from "react";
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
  available: number;
}

interface LaptopSetupItem {
  id: string;
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
      available: 5,
    },
    {
      id: 2,
      name: "Lauren Ingignoli",
      role: "IT Support Specialist",
      image: "https://ca.slack-edge.com/T0RU90MG9-U07SXB7HS2Y-d860e8906469-512",
      available: 3,
    },
    {
      id: 3,
      name: "Zach Vollono",
      role: "IT Support Specialist",
      image: "https://ca.slack-edge.com/T0RU90MG9-U05KY1LUMMF-3cd06e2bfa2c-512",
      available: 2,
    },
  ];

  const [itStaff, setItStaff] = useState<ITStaff[]>(initialItStaff);

  const laptopSetup: LaptopSetupItem[] = [
    {
      id: "DESKTOP-GWAG0N",
      status: "setup",
      assignedTo: "Jennifer Lopez",
      itStaff: "Joe Fraser",
      newHire: "Cash Apps Specialist",
    },
    {
      id: "LAPTOP-TRY7O2",
      status: "ready",
      assignedTo: "Thomas Wright",
      itStaff: "Zach Vollono",
      newHire: "Client Operations Manager",
    },
    {
      id: "DESKTOP-J7309",
      status: "setup",
      assignedTo: "Amanda Lewis",
      itStaff: "Lauren Ingignoli",
      newHire: "Billing Specialist",
    },
    {
      id: "DESKTOP-FOO23",
      status: "ready",
      assignedTo: "David Brown",
      itStaff: "Joe Fraser",
      newHire: "A/R",
    },
  ];

  // Calculate dynamic stats based on IT staff data
  const dynamicStats = useMemo(() => {
    const totalAvailable = itStaff.reduce(
      (sum, staff) => sum + staff.available,
      0
    );
    const assignedLaptops = laptopSetup.filter(
      (laptop) => laptop.status === "ready" || laptop.status === "assigned"
    ).length;

    return [
      {
        icon: ComputerDesktopIcon,
        value: assignedLaptops,
        label: "Assigned Laptops",
        color: "text-blue-500",
      },
      {
        icon: ComputerDesktopIcon,
        value: totalAvailable,
        label: "Available Laptops",
        color: "text-green-500",
      },
      {
        icon: ArrowPathIcon,
        value: laptopSetup.filter((laptop) => laptop.status === "setup").length,
        label: "Pending Return",
        color: "text-red-500",
      },
    ];
  }, [itStaff]);

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

  // Function to increase available laptops for IT staff
  const increaseAvailable = (id: number): void => {
    setItStaff((prevStaff) =>
      prevStaff.map((staff) =>
        staff.id === id
          ? {
              ...staff,
              available: staff.available + 1,
            }
          : staff
      )
    );
  };

  // Function to decrease available laptops for IT staff
  const decreaseAvailable = (id: number): void => {
    setItStaff((prevStaff) =>
      prevStaff.map((staff) =>
        staff.id === id && staff.available > 0
          ? {
              ...staff,
              available: staff.available - 1,
            }
          : staff
      )
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          IT Staff Laptop Inventory
        </h1>
      </div>

      {/* Stats Cards - Now dynamically updated */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {dynamicStats.map((stat, index) => {
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
                  {staff.available}
                </span>
                <span className="text-xs text-gray-500">Available</span>
              </div>
            </div>

            {/* Buttons to adjust available inventory */}
            <div className="flex justify-between items-center">
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => decreaseAvailable(staff.id)}
                  disabled={staff.available <= 0}
                  className={`flex items-center mr-2 px-3 py-2 rounded-md font-medium ${
                    staff.available <= 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  <MinusIcon className="h-4 w-4 mr-1" />
                </button>
                <button
                  onClick={() => increaseAvailable(staff.id)}
                  className="lex items-center ml-2 px-3 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                </button>
              </div>
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
                  Device Name
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

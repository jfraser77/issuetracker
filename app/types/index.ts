export interface MenuItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface StatItem {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: string;
}

export interface ActivityItem {
  employee: string;
  department: string;
  activity: string;
  date: string;
  status: "completed" | "pending" | "warning";
}

export interface OnboardingItem {
  employee: string;
  department: string;
  startDate: string;
  itStatus: string;
  progress: number;
}

export interface CreateNewEmployee {
  firstName: string;
  lastName: string;
  jobTitle: string;
  startDate: string;
  currentManager: string;
  directorRegionalDirector: string;
}

export interface NewEmployee extends CreateNewEmployee {
  id: number;
  timestamp: string;
}

export interface TerminationItem {
  employee: string;
  department: string;
  terminationDate: string;
  laptopReturn: string;
  accessRevoked: string;
}

export interface ITStaff {
  id: number;
  name: string;
  role: string;
  image: string;
  stats: {
    total: number;
    available: number;
    inUse: number;
  };
  laptops: {
    model: string;
    specs: string;
    status: string;
  }[];
}

export interface LaptopInventoryItem {
  id: string;
  model: string;
  specs: string;
  status: string;
  assignedTo: string;
  itStaff: string;
}

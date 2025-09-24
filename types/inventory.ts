export interface CreateInventoryItem {
  name: string;
  description?: string;
  computer: boolean;
  docking_station: boolean;
  phone: boolean;
  monitors: boolean;
  printer: boolean;
  returned: boolean;
}

export interface InventoryItem extends CreateInventoryItem {
  id: number;
  timestamp: string;
}

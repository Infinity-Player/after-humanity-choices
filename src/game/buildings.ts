export type BuildingId = "wall" | "farm" | "raincatcher" | "turret";

export type BuildingCatalogEntry = {
  id: BuildingId;
  name: string;
  cost: number; // scrap cost
  effect?: {
    food?: number;
    water?: number;
    defense?: number;
  };
};

export type PlacedBuilding = {
  id: string;
  buildingId: BuildingId;
  x: number;
  y: number;
  rotation?: 0 | 1 | 2 | 3;
};

export const BUILDING_CATALOG: Record<BuildingId, BuildingCatalogEntry> = {
  wall: { id: "wall", name: "Wall", cost: 1 },
  farm: { id: "farm", name: "Farm", cost: 3, effect: { food: 1 } },
  raincatcher: { id: "raincatcher", name: "Raincatcher", cost: 3, effect: { water: 1 } },
  turret: { id: "turret", name: "Turret", cost: 5, effect: { defense: 2 } },
};

export const BUILDING_LIST: BuildingCatalogEntry[] = Object.values(BUILDING_CATALOG);

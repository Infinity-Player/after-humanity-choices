import React from "react";
import { Button } from "@/components/ui/button";
import { BUILDING_LIST, BuildingId } from "@/game/buildings";

type Props = {
  buildMode: boolean;
  onToggle: () => void;
  selected: BuildingId | null;
  onSelect: (id: BuildingId) => void;
  availableScrap: number;
};

const BuildToolbar: React.FC<Props> = ({ buildMode, onToggle, selected, onSelect, availableScrap }) => {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Build Mode</h3>
        <Button variant={buildMode ? "secondary" : "outline"} size="sm" className="hover-scale" onClick={onToggle}>
          {buildMode ? "Exit (B)" : "Enter (B)"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BUILDING_LIST.map((b) => {
          const affordable = availableScrap >= b.cost;
          const active = selected === b.id;
          return (
            <Button
              key={b.id}
              variant={active ? "secondary" : "outline"}
              className="justify-between"
              onClick={() => onSelect(b.id)}
              disabled={!affordable}
              title={`${b.name} — Cost: ${b.cost} scrap`}
            >
              <span>{b.name}</span>
              <span className="text-xs opacity-80">{b.cost} scrap</span>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Tip: Move cursor over the map, click to place, R to rotate, X to dismantle under cursor.</p>
    </div>
  );
};

export default BuildToolbar;

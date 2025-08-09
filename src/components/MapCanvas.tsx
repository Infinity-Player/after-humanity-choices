import React, { useEffect, useRef } from "react";
import { useCssHsl } from "@/hooks/useCssHsl";
import { BuildingId, PlacedBuilding } from "@/game/buildings";

// Local tile type to match Index.tsx
export type Tile = "floor" | "wall" | "resource" | "terminal";

interface MapCanvasProps {
  map: Tile[][];
  player: { x: number; y: number };
  tileSize?: number;
  className?: string;
  ariaLabel?: string;
  placedBuildings?: PlacedBuilding[];
  buildGhost?: { x: number; y: number; valid: boolean; buildingId: BuildingId };
  onMouseMove?: React.MouseEventHandler<HTMLCanvasElement>;
  onClick?: React.MouseEventHandler<HTMLCanvasElement>;
  onContextMenu?: React.MouseEventHandler<HTMLCanvasElement>;
}

const MapCanvas: React.FC<MapCanvasProps> = ({ map, player, tileSize = 32, className, ariaLabel, placedBuildings, buildGhost, onMouseMove, onClick, onContextMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Colors from CSS tokens
  const bg = useCssHsl("--background");
  const floor = useCssHsl("--secondary");
  const wall = useCssHsl("--border");
  const res = useCssHsl("--accent");
  const term = useCssHsl("--primary");

  const widthTiles = map[0]?.length ?? 0;
  const heightTiles = map.length;

  const destructive = useCssHsl("--destructive");

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // set internal pixel size
    c.width = widthTiles * tileSize;
    c.height = heightTiles * tileSize;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    for (let y = 0; y < heightTiles; y++) {
      for (let x = 0; x < widthTiles; x++) {
        const t = map[y][x];
        if (t === "floor") ctx.fillStyle = floor;
        if (t === "wall") ctx.fillStyle = wall;
        if (t === "resource") ctx.fillStyle = res;
        if (t === "terminal") ctx.fillStyle = term;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
      }
    }

    // placed buildings
    if (Array.isArray(placedBuildings) && placedBuildings.length) {
      for (const b of placedBuildings) {
        if (b.buildingId === "wall") ctx.fillStyle = wall;
        else if (b.buildingId === "farm") ctx.fillStyle = res;
        else if (b.buildingId === "raincatcher") ctx.fillStyle = floor;
        else ctx.fillStyle = term;
        ctx.fillRect(b.x * tileSize + 4, b.y * tileSize + 4, tileSize - 8, tileSize - 8);
      }
    }

    // ghost preview
    if (buildGhost) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = buildGhost.valid ? term : destructive;
      ctx.fillRect(buildGhost.x * tileSize + 2, buildGhost.y * tileSize + 2, tileSize - 4, tileSize - 4);
      ctx.restore();
    }

    // player
    ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-glow")
      .trim()})`;
    ctx.fillRect(player.x * tileSize + 6, player.y * tileSize + 6, tileSize - 12, tileSize - 12);
  }, [map, player, bg, floor, wall, res, term, tileSize, widthTiles, heightTiles, placedBuildings, buildGhost, destructive]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={ariaLabel}
      onMouseMove={onMouseMove}
      onClick={onClick}
      onContextMenu={onContextMenu}
    />
  );
};

export default MapCanvas;

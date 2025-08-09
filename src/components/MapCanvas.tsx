import React, { useEffect, useRef } from "react";
import { useCssHsl } from "@/hooks/useCssHsl";

// Local tile type to match Index.tsx
export type Tile = "floor" | "wall" | "resource" | "terminal";

interface MapCanvasProps {
  map: Tile[][];
  player: { x: number; y: number };
  tileSize?: number;
  className?: string;
  ariaLabel?: string;
}

const MapCanvas: React.FC<MapCanvasProps> = ({ map, player, tileSize = 32, className, ariaLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Colors from CSS tokens
  const bg = useCssHsl("--background");
  const floor = useCssHsl("--secondary");
  const wall = useCssHsl("--border");
  const res = useCssHsl("--accent");
  const term = useCssHsl("--primary");

  const widthTiles = map[0]?.length ?? 0;
  const heightTiles = map.length;

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

    // player
    ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-glow")
      .trim()})`;
    ctx.fillRect(player.x * tileSize + 6, player.y * tileSize + 6, tileSize - 12, tileSize - 12);
  }, [map, player, bg, floor, wall, res, term, tileSize, widthTiles, heightTiles]);

  return (
    <canvas ref={canvasRef} className={className} aria-label={ariaLabel} />
  );
};

export default MapCanvas;

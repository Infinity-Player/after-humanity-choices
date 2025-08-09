import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MapCanvas from "@/components/MapCanvas";
import { Meter } from "@/components/Meter";
import BuildToolbar from "@/components/BuildToolbar";
import { useToast } from "@/hooks/use-toast";
import { BUILDING_CATALOG, BuildingId, PlacedBuilding } from "@/game/buildings";

// Minimal seedable RNG (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type StartingResources = {
  food: number;
  water: number;
  scrap: number;
  med: number;
  ammo: number;
};

type WorldSeed = {
  causeOfCollapse: string;
  zombieType: string;
  formerJob: string;
  worldSeed: number;
  startingResources: StartingResources;
  baseMorality: number; // 0..100
  baseSurvival: number; // 0..100
  initialZombieDensity: number; // 0..1
};

const CAUSES = [
  "Aliens",
  "Corporate AI meltdown",
  "Climate disaster",
  "Capitalist cannibalism",
] as const;

const ZOMBIES = ["Hive mind", "Runners", "Smart", "Cute-but-deadly"] as const;

const JOBS = [
  "Dentist",
  "Influencer",
  "Retired hitman",
  "Barista",
  "Sysadmin",
  "Paramedic",
] as const;

function generateWorldSeed(): WorldSeed {
  const worldSeed = Math.floor(Math.random() * 2_147_483_647);
  const rnd = mulberry32(worldSeed);
  const pick = (arr: readonly string[]) => arr[Math.floor(rnd() * arr.length)];
  const startingResources: StartingResources = {
    food: 15 + Math.floor(rnd() * 20),
    water: 15 + Math.floor(rnd() * 20),
    scrap: 5 + Math.floor(rnd() * 25),
    med: 2 + Math.floor(rnd() * 8),
    ammo: 8 + Math.floor(rnd() * 30),
  };
  const baseMorality = 40 + Math.floor(rnd() * 21); // 40..60
  const baseSurvival = 40 + Math.floor(rnd() * 21); // 40..60
  const initialZombieDensity = Number((0.1 + rnd() * 0.5).toFixed(2));

  return {
    causeOfCollapse: pick(CAUSES as unknown as string[]),
    zombieType: pick(ZOMBIES as unknown as string[]),
    formerJob: pick(JOBS as unknown as string[]),
    worldSeed,
    startingResources,
    baseMorality,
    baseSurvival,
    initialZombieDensity,
  };
}

// Tiny tile engine
type Tile = "floor" | "wall" | "resource" | "terminal";

const TILE_SIZE = 32;
const MAP_W = 24;
const MAP_H = 16;

function buildMap(seed: number): Tile[][] {
  const rnd = mulberry32(seed);
  const grid: Tile[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => (rnd() < 0.08 ? "wall" : "floor"))
  );
  // sprinkle resources
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (grid[y][x] === "floor" && rnd() < 0.06) grid[y][x] = "resource";
    }
  }
  // one terminal
  grid[Math.floor(rnd() * MAP_H)][Math.floor(rnd() * MAP_W)] = "terminal";
  return grid;
}



const Index = () => {
  const [seed, setSeed] = useState<WorldSeed>(generateWorldSeed());
  const [started, setStarted] = useState(false);
  const [morality, setMorality] = useState(seed.baseMorality);
  const [survival, setSurvival] = useState(seed.baseSurvival);
  const [resources, setResources] = useState<StartingResources>(seed.startingResources);
  const [days, setDays] = useState(0);
  const [moralOpen, setMoralOpen] = useState(false);

  // Build mode state
  const [buildMode, setBuildMode] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<BuildingId | null>(null);
  const [placedBuildings, setPlacedBuildings] = useState<PlacedBuilding[]>([]);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [rotation, setRotation] = useState<0 | 1 | 2 | 3>(0);

  const { toast } = useToast();

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setDays((d) => d + 1), 15000); // +1 day every 15s
    const eventId = setInterval(() => setMoralOpen(true), 25000); // prompt a moral choice
    return () => {
      clearInterval(id);
      clearInterval(eventId);
    };
  }, [started]);

  // Map + player
  const map = useMemo(() => buildMap(seed.worldSeed), [seed.worldSeed]);
  const [player, setPlayer] = useState({ x: 2, y: 2 });

  // Build helpers
  const isBuildingAt = (x: number, y: number) => placedBuildings.find((b) => b.x === x && b.y === y);
  const canPlaceAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
    const t = map[y][x];
    if (t !== "floor") return false; // must be empty floor
    if (isBuildingAt(x, y)) return false;
    return true;
  };
  const placeSelectedAt = (x: number, y: number) => {
    if (!selectedBuildingId) return;
    const cost = BUILDING_CATALOG[selectedBuildingId].cost;
    if (!canPlaceAt(x, y) || resources.scrap < cost) return;
    const newB: PlacedBuilding = {
      id: `${selectedBuildingId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      buildingId: selectedBuildingId,
      x,
      y,
      rotation,
    };
    setPlacedBuildings((prev) => [...prev, newB]);
    setResources((r) => ({ ...r, scrap: r.scrap - cost }));
    toast({ title: "Built", description: `${BUILDING_CATALOG[selectedBuildingId].name} placed (-${cost} scrap)` });
  };
  const dismantleAt = (x: number, y: number) => {
    const exist = isBuildingAt(x, y);
    if (!exist) return;
    const cost = BUILDING_CATALOG[exist.buildingId].cost;
    const refund = Math.floor(cost * 0.5);
    setPlacedBuildings((prev) => prev.filter((b) => b.id !== exist.id));
    setResources((r) => ({ ...r, scrap: r.scrap + refund }));
    toast({ title: "Dismantled", description: `Refunded ${refund} scrap` });
  };

  const handleMouseMove: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    if (!buildMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);
    setGhost({ x, y });
  };
  const handleCanvasClick: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    if (!buildMode) return;
    e.preventDefault();
    if (!ghost) return;
    if (selectedBuildingId) placeSelectedAt(ghost.x, ghost.y);
  };
  const handleContextMenu: React.MouseEventHandler<HTMLCanvasElement> = (e) => {
    if (!buildMode) return;
    e.preventDefault();
    setSelectedBuildingId(null);
  };

  // Input
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      // Global toggles
      if (e.code === "KeyB") {
        e.preventDefault();
        setBuildMode((m) => {
          const next = !m;
          if (next && !selectedBuildingId) setSelectedBuildingId("wall");
          if (!next) setGhost(null);
          return next;
        });
        return;
      }

      if (buildMode) {
        if (e.code === "Escape") {
          e.preventDefault();
          setBuildMode(false);
          setGhost(null);
          return;
        }
        if (e.code === "KeyR") {
          e.preventDefault();
          setRotation((r) => (((r + 1) % 4) as 0 | 1 | 2 | 3));
          return;
        }
        if (e.code === "KeyX") {
          e.preventDefault();
          if (ghost) dismantleAt(ghost.x, ghost.y);
          return;
        }
        // Ignore movement while in build mode
        return;
      }

      const dir: Record<string, { dx: number; dy: number }> = {
        ArrowUp: { dx: 0, dy: -1 },
        KeyW: { dx: 0, dy: -1 },
        ArrowDown: { dx: 0, dy: 1 },
        KeyS: { dx: 0, dy: 1 },
        ArrowLeft: { dx: -1, dy: 0 },
        KeyA: { dx: -1, dy: 0 },
        ArrowRight: { dx: 1, dy: 0 },
        KeyD: { dx: 1, dy: 0 },
      };
      const m = dir[e.code];
      if (!m) return;
      e.preventDefault();
      setPlayer((p) => {
        const nx = Math.max(0, Math.min(MAP_W - 1, p.x + m.dx));
        const ny = Math.max(0, Math.min(MAP_H - 1, p.y + m.dy));
        if (map[ny][nx] === "wall") return p; // blocked
        if (isBuildingAt(nx, ny)) return p; // building blocks

        // collect resource
        if (map[ny][nx] === "resource") {
          map[ny][nx] = "floor";
          setResources((r) => ({ ...r, food: r.food + 1, water: r.water + 1, scrap: r.scrap + 1 }));
        }
        // terminal opens moral choice
        if (map[ny][nx] === "terminal") {
          setMoralOpen(true);
        }
        return { x: nx, y: ny };
      });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map, started, buildMode, ghost, selectedBuildingId, placedBuildings]);

  // Daily building effects on day tick
  useEffect(() => {
    if (!started || days === 0) return;
    const farms = placedBuildings.filter((b) => b.buildingId === "farm").length;
    const rains = placedBuildings.filter((b) => b.buildingId === "raincatcher").length;
    if (farms || rains) {
      setResources((r) => ({ ...r, food: r.food + farms, water: r.water + rains }));
      toast({ title: "Daily yields", description: `+${farms} food, +${rains} water from your base.` });
    }
  }, [days, started, placedBuildings]);

  const handleChoice = (share: boolean) => {
    setMoralOpen(false);
    if (share) {
      setMorality((m) => Math.min(100, m + 6));
      setSurvival((s) => Math.max(0, s - 3));
      setResources((r) => ({ ...r, food: Math.max(0, r.food - 2), water: Math.max(0, r.water - 1) }));
    } else {
      setMorality((m) => Math.max(0, m - 6));
      setSurvival((s) => Math.min(100, s + 4));
    }
  };

  const resetRun = () => {
    const next = generateWorldSeed();
    setSeed(next);
    setMorality(next.baseMorality);
    setSurvival(next.baseSurvival);
    setResources(next.startingResources);
    setDays(0);
    setPlayer({ x: 2, y: 2 });
    setPlacedBuildings([]);
    setBuildMode(false);
    setSelectedBuildingId(null);
    setGhost(null);
    setRotation(0);
    setStarted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-apocalypse">
      <header className="container py-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">After Humanity: The End is You</h1>
        <p className="text-muted-foreground mt-1">Procedural 2D survival with moral choices.</p>
      </header>

      <main className="container pb-20">
        {!started ? (
          <section className="grid gap-6 sm:grid-cols-2 items-start">
            <article className="glass-panel rounded-lg p-6 animate-enter">
              <h2 className="text-xl font-semibold mb-2">World Seed</h2>
              <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div className="hud-chip">Cause: {seed.causeOfCollapse}</div>
                <div className="hud-chip">Zombies: {seed.zombieType}</div>
                <div className="hud-chip">Former job: {seed.formerJob}</div>
                <div className="hud-chip">Seed: {seed.worldSeed}</div>
                <div className="hud-chip">Zombie density: {seed.initialZombieDensity}</div>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-2 text-center">
                <div className="hud-chip">Food: {seed.startingResources.food}</div>
                <div className="hud-chip">Water: {seed.startingResources.water}</div>
                <div className="hud-chip">Scrap: {seed.startingResources.scrap}</div>
                <div className="hud-chip">Med: {seed.startingResources.med}</div>
                <div className="hud-chip">Ammo: {seed.startingResources.ammo}</div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="hero" size="xl" className="hover-scale" onClick={() => setStarted(true)}>
                  Start Run
                </Button>
                <Button variant="outline" className="hover-scale" onClick={() => setSeed(generateWorldSeed())}>Reroll Seed</Button>
              </div>
            </article>

            <aside className="glass-panel rounded-lg p-6 animate-enter">
              <h2 className="text-xl font-semibold mb-2">Morality vs Survival</h2>
              <div className="space-y-4">
                <Meter label="Morality" value={morality} colorClass="" />
                <Meter label="Survival" value={survival} colorClass="" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Your choices shift these meters and shape endings, trust, and events.
              </p>
            </aside>
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="glass-panel rounded-lg p-3 overflow-hidden animate-enter">
              <MapCanvas
                map={map}
                player={player}
                tileSize={TILE_SIZE}
                className="w-full h-auto rounded-md"
                ariaLabel="Top-down city grid"
                placedBuildings={placedBuildings}
                buildGhost={
                  buildMode && ghost && selectedBuildingId
                    ? {
                        x: ghost.x,
                        y: ghost.y,
                        valid: canPlaceAt(ghost.x, ghost.y) && resources.scrap >= BUILDING_CATALOG[selectedBuildingId].cost,
                        buildingId: selectedBuildingId,
                      }
                    : undefined
                }
                onMouseMove={handleMouseMove}
                onClick={handleCanvasClick}
                onContextMenu={handleContextMenu}
              />
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <div className="hud-chip">Food: {resources.food}</div>
                <div className="hud-chip">Water: {resources.water}</div>
                <div className="hud-chip">Scrap: {resources.scrap}</div>
                <div className="hud-chip">Med: {resources.med}</div>
                <div className="hud-chip">Ammo: {resources.ammo}</div>
                <div className="hud-chip">Days: {days}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Move with WASD / Arrow keys. Step on green tiles to scavenge. Terminals trigger dilemmas.</p>
            </div>

            <aside className="glass-panel rounded-lg p-6 animate-enter space-y-4">
              <h2 className="text-xl font-semibold">Status</h2>
              <Meter label="Morality" value={morality} colorClass="" />
              <Meter label="Survival" value={survival} colorClass="" />
              <div className="pt-2 flex gap-3">
                <Button variant="outline" className="hover-scale" onClick={() => setMoralOpen(true)}>Trigger Dilemma</Button>
                <Button variant="secondary" className="hover-scale" onClick={resetRun}>New Run</Button>
              </div>

              <BuildToolbar
                buildMode={buildMode}
                onToggle={() => setBuildMode((m) => !m)}
                selected={selectedBuildingId}
                onSelect={(id) => {
                  setSelectedBuildingId(id);
                  if (!buildMode) setBuildMode(true);
                }}
                availableScrap={resources.scrap}
              />
            </aside>
          </section>
        )}
      </main>

      <Dialog open={moralOpen} onOpenChange={setMoralOpen}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle>Moral Machine: Apocalypse Edition</DialogTitle>
            <DialogDescription>
              A starving family begs at your gate on a stormy night. Your stores are low.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => handleChoice(true)}>Share last rations</Button>
            <Button variant="destructive" onClick={() => handleChoice(false)}>Turn them away at gunpoint</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Choices affect trust, morale, and future events.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;

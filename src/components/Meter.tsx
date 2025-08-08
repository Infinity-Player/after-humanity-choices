import React from "react";
import { Progress } from "@/components/ui/progress";

export const Meter: React.FC<{ label: string; value: number; colorClass?: string }> = ({ label, value, colorClass = "" }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <Progress className={colorClass} value={value} />
  </div>
);

export default Meter;

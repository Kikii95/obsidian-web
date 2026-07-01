"use client";

import { RotateCcw, SlidersHorizontal, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/lib/settings-store";
import type { ClusterBy } from "@/lib/graph/types";
import type { LabelDensity } from "@/lib/graph/constants";

const CLUSTER_OPTIONS: { value: ClusterBy; label: string }[] = [
  { value: "folder", label: "Dossier" },
  { value: "tag", label: "Tag" },
  { value: "none", label: "Aucune" },
];
const DENSITY_OPTIONS: { value: LabelDensity; label: string }[] = [
  { value: "low", label: "Peu" },
  { value: "medium", label: "Moyen" },
  { value: "high", label: "Max" },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 rounded px-2 py-1 text-[11px] transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Graph3dControls() {
  const { settings, updateSettings } = useSettingsStore();
  return (
    <div className="space-y-4 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Vue 3D</p>
      <div className="space-y-2">
        <Label className="text-xs">Couleur des amas</Label>
        <Segmented
          value={settings.graph3dClusterBy}
          options={CLUSTER_OPTIONS}
          onChange={(value) => updateSettings({ graph3dClusterBy: value })}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Densité des labels</Label>
        <Segmented
          value={settings.graph3dLabelDensity}
          options={DENSITY_OPTIONS}
          onChange={(value) => updateSettings({ graph3dLabelDensity: value })}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Intensité néon</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {settings.graph3dBloomIntensity.toFixed(1)}
          </span>
        </div>
        <Slider
          value={[settings.graph3dBloomIntensity * 10]}
          onValueChange={([value]) => updateSettings({ graph3dBloomIntensity: value / 10 })}
          min={0}
          max={30}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Taille des nœuds</Label>
          <span className="font-mono text-xs text-muted-foreground">
            {settings.graph3dNodeSize.toFixed(1)}
          </span>
        </div>
        <Slider
          value={[settings.graph3dNodeSize * 10]}
          onValueChange={([value]) => updateSettings({ graph3dNodeSize: value / 10 })}
          min={5}
          max={30}
          step={1}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Tags comme nœuds</Label>
        <Switch
          checked={settings.graph3dShowTags}
          onCheckedChange={(checked) => updateSettings({ graph3dShowTags: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Arêtes animées</Label>
        <Switch
          checked={settings.graph3dEdgeFlow}
          onCheckedChange={(checked) => updateSettings({ graph3dEdgeFlow: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Effets réduits</Label>
        <Switch
          checked={settings.graph3dReducedEffects}
          onCheckedChange={(checked) => updateSettings({ graph3dReducedEffects: checked })}
        />
      </div>
    </div>
  );
}

interface GraphSettingsPopoverProps {
  is3d: boolean;
  currentZoom: number;
  onSaveZoom: () => void;
}

export function GraphSettingsPopover({ is3d, currentZoom, onSaveZoom }: GraphSettingsPopoverProps) {
  const { settings, updateSettings } = useSettingsStore();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" title="Réglages du graph">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="max-h-[70vh] w-72 overflow-y-auto" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Réglages Graph</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() =>
                updateSettings({
                  graphForceStrength: -300,
                  graphLinkDistance: 80,
                  graphGravityStrength: 0.05,
                })
              }
              title="Réinitialiser"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Notes orphelines</Label>
            <Switch
              checked={settings.showOrphanNotes}
              onCheckedChange={(checked) => updateSettings({ showOrphanNotes: checked })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Répulsion</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.abs(settings.graphForceStrength)}
              </span>
            </div>
            <Slider
              value={[Math.abs(settings.graphForceStrength)]}
              onValueChange={([value]) => updateSettings({ graphForceStrength: -value })}
              min={1}
              max={500}
              step={1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Distance liens</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {settings.graphLinkDistance}px
              </span>
            </div>
            <Slider
              value={[settings.graphLinkDistance]}
              onValueChange={([value]) => updateSettings({ graphLinkDistance: value })}
              min={5}
              max={200}
              step={5}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Gravité</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {(settings.graphGravityStrength ?? 0.05).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[(settings.graphGravityStrength ?? 0.05) * 100]}
              onValueChange={([value]) => updateSettings({ graphGravityStrength: value / 100 })}
              min={0}
              max={30}
              step={1}
            />
          </div>

          {is3d ? (
            <Graph3dControls />
          ) : (
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Zoom par défaut</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Actuel: {Math.round(currentZoom * 100)}%
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onSaveZoom}
                >
                  <ZoomIn className="mr-1 h-3 w-3" />
                  Set
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

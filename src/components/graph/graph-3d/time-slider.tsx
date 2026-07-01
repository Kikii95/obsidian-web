"use client";

import { useEffect, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIME_LAPSE_INTERVAL_MS, TIME_LAPSE_STEPS } from "@/lib/graph/constants";
import type { TimeExtent } from "@/lib/graph/temporal";
import { useGraphViewStore } from "./graph-view-store";

interface TimeSliderProps {
  extent: TimeExtent;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Time-lapse strip: scrub or auto-play the vault's growth over time. */
export function TimeSlider({ extent }: TimeSliderProps) {
  const timeCursor = useGraphViewStore((state) => state.timeCursor);
  const setTimeCursor = useGraphViewStore((state) => state.setTimeCursor);
  const [playing, setPlaying] = useState(false);

  const span = extent.max - extent.min;
  const cursor = timeCursor ?? extent.max;
  const ratio = span > 0 ? (cursor - extent.min) / span : 1;

  useEffect(() => {
    if (!playing || span <= 0) return;
    const step = span / TIME_LAPSE_STEPS;
    const id = setInterval(() => {
      const current = useGraphViewStore.getState().timeCursor ?? extent.max;
      const next = current + step;
      if (next >= extent.max) {
        setTimeCursor(extent.max);
        setPlaying(false);
      } else {
        setTimeCursor(next);
      }
    }, TIME_LAPSE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, span, extent.max, setTimeCursor]);

  const togglePlay = () => {
    if (!playing && cursor >= extent.max) setTimeCursor(extent.min);
    setPlaying((value) => !value);
  };

  const onSlide = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlaying(false);
    const next = extent.min + (Number(event.target.value) / TIME_LAPSE_STEPS) * span;
    setTimeCursor(next);
  };

  const close = () => {
    setPlaying(false);
    setTimeCursor(null);
  };

  return (
    <div className="pointer-events-auto absolute bottom-20 left-1/2 z-10 flex w-80 max-w-[86vw] items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur -translate-x-1/2">
      <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={togglePlay}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="min-w-0 flex-1">
        <input
          type="range"
          min={0}
          max={TIME_LAPSE_STEPS}
          value={Math.round(ratio * TIME_LAPSE_STEPS)}
          onChange={onSlide}
          className="w-full accent-primary"
          aria-label="Curseur temporel"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
          <span className="tabular-nums">{formatDate(cursor)}</span>
          <span>{extent.dated}/{extent.total} datées</span>
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Fermer la frise"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

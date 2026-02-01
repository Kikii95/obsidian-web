"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TEMPLATE_VARIABLES } from "@/lib/template-engine";

export function TemplateVariablesHelp() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="sr-only">Variables disponibles</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" side="right" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Variables de template</h4>
          <p className="text-xs text-muted-foreground">
            Utilisez ces variables dans vos templates :
          </p>
          <div className="space-y-1.5 max-h-48 overflow-auto">
            {TEMPLATE_VARIABLES.map(({ variable, description }) => (
              <div
                key={variable}
                className="flex items-start gap-2 text-xs"
              >
                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">
                  {variable}
                </code>
                <span className="text-muted-foreground">{description}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

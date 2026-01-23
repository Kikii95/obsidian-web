"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mainElement = document.getElementById("main-content");
    if (!mainElement) return;

    const handleScroll = () => {
      // Show button after scrolling down 300px
      setIsVisible(mainElement.scrollTop > 300);
    };

    mainElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainElement.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    const mainElement = document.getElementById("main-content");
    mainElement?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!isVisible) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      className={cn(
        "fixed bottom-6 right-6 z-40 rounded-full shadow-lg",
        "transition-all duration-300 hover:scale-110",
        "bg-primary/10 hover:bg-primary/20 border border-primary/20"
      )}
      onClick={scrollToTop}
      title="Retour en haut"
    >
      <ArrowUp className="h-5 w-5 text-primary" />
    </Button>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  isActive: boolean;
  onActiveChange: (active: boolean) => void;
  className?: string;
  language?: string;
}

// TypeScript types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

// Check support outside component
const checkSpeechSupport = () =>
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function VoiceInput({
  onTranscript,
  onInterimTranscript,
  isActive,
  onActiveChange,
  className,
  language = "fr-FR",
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = checkSpeechSupport();

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }

      if (interimTranscript && onInterimTranscript) {
        onInterimTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      switch (event.error) {
        case "no-speech":
          setError("Pas de voix détectée. Réessayez.");
          break;
        case "audio-capture":
          setError("Microphone non accessible.");
          break;
        case "not-allowed":
          setError("Permission microphone refusée.");
          break;
        case "network":
          setError("Erreur réseau. Vérifiez votre connexion.");
          break;
        default:
          setError("Erreur de reconnaissance vocale.");
      }

      setIsListening(false);
      onActiveChange(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      // If still supposed to be active, restart (for continuous)
      if (isActive && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Already started, ignore
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, onTranscript, onInterimTranscript, onActiveChange, isActive]);

  // Handle active state changes
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isActive && !isListening) {
      try {
        recognitionRef.current.start();
      } catch {
        // Already started
      }
    } else if (!isActive && isListening) {
      recognitionRef.current.stop();
    }
  }, [isActive, isListening]);

  const toggleVoice = useCallback(() => {
    setError(null);
    onActiveChange(!isActive);
  }, [isActive, onActiveChange]);

  if (!isSupported) {
    return (
      <button
        disabled
        className={cn(
          "p-2 rounded-lg opacity-50 cursor-not-allowed",
          "bg-muted text-muted-foreground",
          className
        )}
        title="Voice input not supported in this browser"
      >
        <MicOff className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={toggleVoice}
        className={cn(
          "p-2 rounded-lg transition-all duration-200",
          isActive
            ? "bg-red-500/20 text-red-500 ring-2 ring-red-500/50 animate-pulse"
            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
          className
        )}
        title={isActive ? "Stop voice input" : "Start voice input"}
      >
        {isListening ? (
          <Mic className="h-5 w-5" />
        ) : isActive ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Voice active indicator */}
      {isActive && isListening && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

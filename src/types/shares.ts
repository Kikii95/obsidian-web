import type { Share } from "@/lib/db/schema";

export type { Share };

export type ShareType = "folder" | "note";
export type ShareMode = "reader" | "writer";

export interface CreateShareInput {
  shareType?: ShareType;
  folderPath: string; // folder path OR note path (without .md)
  name?: string; // optional custom name (defaults to folder/note name)
  includeSubfolders?: boolean; // only used for folders
  expiresIn: ExpirationValue;
  mode?: ShareMode; // default: reader
}

export type ExpirationValue = "1h" | "1d" | "1w" | "1m";

export interface ExpirationOption {
  value: ExpirationValue;
  label: string;
  ms: number;
}

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { value: "1h", label: "1 heure", ms: 60 * 60 * 1000 },
  { value: "1d", label: "1 jour", ms: 24 * 60 * 60 * 1000 },
  { value: "1w", label: "1 semaine", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "1m", label: "1 mois", ms: 30 * 24 * 60 * 60 * 1000 },
];

export function getExpirationMs(value: ExpirationValue): number {
  const option = EXPIRATION_OPTIONS.find((o) => o.value === value);
  return option?.ms ?? EXPIRATION_OPTIONS[2].ms; // Default 1 week
}

export interface ShareMetadata {
  token: string;
  shareType: ShareType;
  folderPath: string;
  folderName: string;
  name: string | null; // custom name or null
  includeSubfolders: boolean;
  mode: ShareMode;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface ShareContext {
  share: Share;
  octokit: import("@octokit/rest").Octokit;
  vaultConfig: {
    owner: string;
    repo: string;
    branch: string;
    rootPath: string;
  };
}

/**
 * Template Engine for Obsidian Web
 * Supports variables: {{date}}, {{date:FORMAT}}, {{time}}, {{time:FORMAT}},
 * {{title}}, {{folder}}, {{clipboard}}, {{uuid}}, {{random:N}},
 * {{week}}, {{quarter}}, {{dayOfYear}}, {{tomorrow}}, {{yesterday}}, {{weekday}}
 */

export interface TemplateContext {
  title: string;
  folder: string;
  clipboard?: string;
}

// Date format tokens
const DATE_TOKENS: Record<string, (d: Date) => string> = {
  YYYY: (d) => String(d.getFullYear()),
  YY: (d) => String(d.getFullYear()).slice(-2),
  MM: (d) => String(d.getMonth() + 1).padStart(2, "0"),
  M: (d) => String(d.getMonth() + 1),
  DD: (d) => String(d.getDate()).padStart(2, "0"),
  D: (d) => String(d.getDate()),
  ddd: (d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()],
  dddd: (d) =>
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()],
  HH: (d) => String(d.getHours()).padStart(2, "0"),
  H: (d) => String(d.getHours()),
  hh: (d) => String(d.getHours() % 12 || 12).padStart(2, "0"),
  h: (d) => String(d.getHours() % 12 || 12),
  mm: (d) => String(d.getMinutes()).padStart(2, "0"),
  m: (d) => String(d.getMinutes()),
  ss: (d) => String(d.getSeconds()).padStart(2, "0"),
  s: (d) => String(d.getSeconds()),
  A: (d) => (d.getHours() < 12 ? "AM" : "PM"),
  a: (d) => (d.getHours() < 12 ? "am" : "pm"),
};

/**
 * Format a date using a format string
 * Supported tokens: YYYY, YY, MM, M, DD, D, ddd, dddd, HH, H, hh, h, mm, m, ss, s, A, a
 */
export function formatDate(date: Date, format: string): string {
  let result = format;

  // Sort tokens by length (longest first) to avoid partial replacements
  const sortedTokens = Object.keys(DATE_TOKENS).sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    result = result.replace(new RegExp(token, "g"), DATE_TOKENS[token](date));
  }

  return result;
}

/** Get ISO week number (1-53) */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Get quarter (Q1-Q4) */
function getQuarter(date: Date): string {
  return `Q${Math.floor(date.getMonth() / 3) + 1}`;
}

/** Get day of year (1-366) */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Generate UUID v4 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/** Generate random alphanumeric string */
function generateRandom(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: Math.min(length, 100) }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

/**
 * Parse and process a single template variable
 */
function processVariable(variable: string, context: TemplateContext, now: Date): string {
  const trimmed = variable.trim();

  // {{title}}
  if (trimmed.toLowerCase() === "title") {
    return context.title;
  }

  // {{folder}}
  if (trimmed.toLowerCase() === "folder") {
    return context.folder || "";
  }

  // {{clipboard}}
  if (trimmed.toLowerCase() === "clipboard") {
    return context.clipboard || "";
  }

  // {{uuid}}
  if (trimmed.toLowerCase() === "uuid") {
    return generateUUID();
  }

  // {{random:N}}
  const randomMatch = trimmed.match(/^random:(\d+)$/i);
  if (randomMatch) {
    return generateRandom(parseInt(randomMatch[1], 10));
  }

  // {{week}}
  if (trimmed.toLowerCase() === "week") {
    return String(getWeekNumber(now)).padStart(2, "0");
  }

  // {{quarter}}
  if (trimmed.toLowerCase() === "quarter") {
    return getQuarter(now);
  }

  // {{dayOfYear}}
  if (trimmed.toLowerCase() === "dayofyear") {
    return String(getDayOfYear(now));
  }

  // {{tomorrow}}
  if (trimmed.toLowerCase() === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  // {{yesterday}}
  if (trimmed.toLowerCase() === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }

  // {{weekday}}
  if (trimmed.toLowerCase() === "weekday") {
    return now.toLocaleDateString('fr-FR', { weekday: 'long' });
  }

  // {{date}} or {{date:FORMAT}}
  if (trimmed.toLowerCase().startsWith("date")) {
    const formatMatch = trimmed.match(/^date:(.+)$/i);
    if (formatMatch) {
      return formatDate(now, formatMatch[1]);
    }
    // Default: ISO date
    return now.toISOString().split("T")[0];
  }

  // {{time}} or {{time:FORMAT}}
  if (trimmed.toLowerCase().startsWith("time")) {
    const formatMatch = trimmed.match(/^time:(.+)$/i);
    if (formatMatch) {
      return formatDate(now, formatMatch[1]);
    }
    // Default: HH:mm
    return formatDate(now, "HH:mm");
  }

  // Unknown variable - return as-is
  return `{{${variable}}}`;
}

/**
 * Process a template string, replacing all variables
 */
export function processTemplate(template: string, context: TemplateContext): string {
  const now = new Date();

  // Match {{variable}} or {{variable:format}}
  return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    return processVariable(variable, context, now);
  });
}

/**
 * Get clipboard content (async, browser only)
 */
export async function getClipboardContent(): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return "";
  }

  try {
    return await navigator.clipboard.readText();
  } catch {
    // Permission denied or other error
    return "";
  }
}

/**
 * Check if a template uses clipboard variable
 */
export function templateUsesClipboard(template: string): boolean {
  return /\{\{\s*clipboard\s*\}\}/i.test(template);
}

/**
 * List of available template variables with descriptions
 */
export const TEMPLATE_VARIABLES = [
  { variable: "{{title}}", description: "Titre de la note" },
  { variable: "{{folder}}", description: "Chemin du dossier" },
  { variable: "{{date}}", description: "Date actuelle (YYYY-MM-DD)" },
  { variable: "{{date:DD/MM/YYYY}}", description: "Date format français" },
  { variable: "{{time}}", description: "Heure actuelle (HH:mm)" },
  { variable: "{{time:HH:mm:ss}}", description: "Heure avec secondes" },
  { variable: "{{clipboard}}", description: "Contenu du presse-papiers" },
  { variable: "{{uuid}}", description: "UUID v4 unique" },
  { variable: "{{random:8}}", description: "Chaîne aléatoire de N caractères" },
  { variable: "{{week}}", description: "Numéro de semaine ISO (01-53)" },
  { variable: "{{quarter}}", description: "Trimestre (Q1-Q4)" },
  { variable: "{{dayOfYear}}", description: "Jour de l'année (1-366)" },
  { variable: "{{tomorrow}}", description: "Date de demain" },
  { variable: "{{yesterday}}", description: "Date d'hier" },
  { variable: "{{weekday}}", description: "Nom du jour (lundi, mardi...)" },
] as const;

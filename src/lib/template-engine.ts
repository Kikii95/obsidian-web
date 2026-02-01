/**
 * Template Engine for Obsidian Web
 * Supports variables: {{date}}, {{date:FORMAT}}, {{time}}, {{time:FORMAT}},
 * {{title}}, {{folder}}, {{clipboard}}
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
  { variable: "{{date:dddd, MMMM D, YYYY}}", description: "Date longue" },
  { variable: "{{time}}", description: "Heure actuelle (HH:mm)" },
  { variable: "{{time:HH:mm:ss}}", description: "Heure avec secondes" },
  { variable: "{{clipboard}}", description: "Contenu du presse-papiers" },
] as const;

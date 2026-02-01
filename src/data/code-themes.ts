export interface CodeTheme {
  id: string;
  name: string;
  isDark: boolean | "auto"; // "auto" = follows global theme
  darkVariant?: string; // Theme to use in dark mode (for auto)
  lightVariant?: string; // Theme to use in light mode (for auto)
}

export const codeThemes: CodeTheme[] = [
  // Auto theme (follows global theme)
  {
    id: "auto",
    name: "Auto (suit le thème)",
    isDark: "auto",
    darkVariant: "github-dark",
    lightVariant: "github",
  },
  // Dark themes
  { id: "atom-one-dark", name: "Atom One Dark", isDark: true },
  { id: "github-dark", name: "GitHub Dark", isDark: true },
  { id: "dracula", name: "Dracula", isDark: true },
  { id: "monokai", name: "Monokai", isDark: true },
  { id: "nord", name: "Nord", isDark: true },
  { id: "tokyo-night-dark", name: "Tokyo Night", isDark: true },
  { id: "vs2015", name: "VS2015", isDark: true },
  { id: "night-owl", name: "Night Owl", isDark: true },
  { id: "agate", name: "Agate", isDark: true },
  { id: "androidstudio", name: "Android Studio", isDark: true },
  // Light themes
  { id: "atom-one-light", name: "Atom One Light", isDark: false },
  { id: "github", name: "GitHub Light", isDark: false },
  { id: "vs", name: "Visual Studio", isDark: false },
  { id: "xcode", name: "Xcode", isDark: false },
];

export const defaultCodeTheme = "auto"; // Default to auto (follows theme)

// Get the auto theme config
export function getAutoTheme(): CodeTheme | undefined {
  return codeThemes.find((t) => t.id === "auto");
}

export function getCodeTheme(id: string): CodeTheme | undefined {
  return codeThemes.find((t) => t.id === id);
}

export function getDarkCodeThemes(): CodeTheme[] {
  return codeThemes.filter((t) => t.isDark);
}

export function getLightCodeThemes(): CodeTheme[] {
  return codeThemes.filter((t) => !t.isDark);
}

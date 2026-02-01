export interface CodeTheme {
  id: string;
  name: string;
  isDark: boolean;
}

export const codeThemes: CodeTheme[] = [
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
  // Light themes (for completeness)
  { id: "atom-one-light", name: "Atom One Light", isDark: false },
  { id: "github", name: "GitHub Light", isDark: false },
  { id: "vs", name: "Visual Studio", isDark: false },
  { id: "xcode", name: "Xcode", isDark: false },
];

export const defaultCodeTheme = "atom-one-dark";

export function getCodeTheme(id: string): CodeTheme | undefined {
  return codeThemes.find((t) => t.id === id);
}

export function getDarkCodeThemes(): CodeTheme[] {
  return codeThemes.filter((t) => t.isDark);
}

export function getLightCodeThemes(): CodeTheme[] {
  return codeThemes.filter((t) => !t.isDark);
}

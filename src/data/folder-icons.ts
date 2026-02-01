import {
  Folder,
  FolderOpen,
  Archive,
  BookOpen,
  Briefcase,
  Calendar,
  Code,
  Database,
  FileText,
  FolderHeart,
  FolderLock,
  GraduationCap,
  Heart,
  Home,
  Image,
  Inbox,
  Library,
  Lightbulb,
  Mail,
  Map,
  Music,
  Newspaper,
  Package,
  Palette,
  PenTool,
  Settings,
  Shield,
  Star,
  Tag,
  Target,
  Terminal,
  TestTube,
  Trash2,
  Trophy,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface FolderIcon {
  id: string;
  name: string;
  icon: LucideIcon;
  color?: string;
}

export const folderIcons: FolderIcon[] = [
  { id: "default", name: "Default", icon: Folder },
  { id: "folder-open", name: "Open", icon: FolderOpen },
  { id: "archive", name: "Archive", icon: Archive, color: "text-orange-500" },
  { id: "book", name: "Book", icon: BookOpen, color: "text-emerald-500" },
  { id: "briefcase", name: "Work", icon: Briefcase, color: "text-blue-500" },
  { id: "calendar", name: "Calendar", icon: Calendar, color: "text-purple-500" },
  { id: "code", name: "Code", icon: Code, color: "text-cyan-500" },
  { id: "database", name: "Database", icon: Database, color: "text-rose-500" },
  { id: "documents", name: "Documents", icon: FileText, color: "text-amber-500" },
  { id: "favorites", name: "Favorites", icon: FolderHeart, color: "text-pink-500" },
  { id: "private", name: "Private", icon: FolderLock, color: "text-red-500" },
  { id: "education", name: "Education", icon: GraduationCap, color: "text-indigo-500" },
  { id: "health", name: "Health", icon: Heart, color: "text-red-400" },
  { id: "home", name: "Home", icon: Home, color: "text-sky-500" },
  { id: "images", name: "Images", icon: Image, color: "text-fuchsia-500" },
  { id: "inbox", name: "Inbox", icon: Inbox, color: "text-slate-500" },
  { id: "library", name: "Library", icon: Library, color: "text-amber-600" },
  { id: "ideas", name: "Ideas", icon: Lightbulb, color: "text-yellow-500" },
  { id: "mail", name: "Mail", icon: Mail, color: "text-blue-400" },
  { id: "travel", name: "Travel", icon: Map, color: "text-green-500" },
  { id: "music", name: "Music", icon: Music, color: "text-violet-500" },
  { id: "news", name: "News", icon: Newspaper, color: "text-zinc-500" },
  { id: "packages", name: "Packages", icon: Package, color: "text-orange-400" },
  { id: "creative", name: "Creative", icon: Palette, color: "text-pink-400" },
  { id: "writing", name: "Writing", icon: PenTool, color: "text-teal-500" },
  { id: "settings", name: "Settings", icon: Settings, color: "text-gray-500" },
  { id: "security", name: "Security", icon: Shield, color: "text-green-600" },
  { id: "starred", name: "Starred", icon: Star, color: "text-yellow-400" },
  { id: "tags", name: "Tags", icon: Tag, color: "text-lime-500" },
  { id: "goals", name: "Goals", icon: Target, color: "text-red-500" },
  { id: "terminal", name: "Terminal", icon: Terminal, color: "text-green-400" },
  { id: "experiments", name: "Experiments", icon: TestTube, color: "text-purple-400" },
  { id: "trash", name: "Trash", icon: Trash2, color: "text-gray-400" },
  { id: "achievements", name: "Achievements", icon: Trophy, color: "text-amber-400" },
  { id: "people", name: "People", icon: Users, color: "text-blue-500" },
  { id: "videos", name: "Videos", icon: Video, color: "text-red-400" },
  { id: "quick", name: "Quick", icon: Zap, color: "text-yellow-500" },
];

export function getFolderIcon(id: string): FolderIcon | undefined {
  return folderIcons.find((icon) => icon.id === id);
}

export function getDefaultIcon(): FolderIcon {
  return folderIcons[0];
}

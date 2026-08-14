import {
  Camera,
  Car,
  Dog,
  Dumbbell,
  Flower2,
  GraduationCap,
  type LucideIcon,
  Scissors,
  Sparkles,
  SprayCan,
  Wand2,
  Wrench,
} from "lucide-react";

/**
 * Category → icon. Categories store an icon *name* so a new category can be
 * added as data; this map is the only place icons are resolved.
 */
const ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  "scissors-line": Scissors,
  sparkles: Sparkles,
  wand: Wand2,
  flower: Flower2,
  car: Car,
  dog: Dog,
  spray: SprayCan,
  wrench: Wrench,
  graduation: GraduationCap,
  dumbbell: Dumbbell,
  camera: Camera,
};

export function categoryIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

export function CategoryIcon({
  icon,
  className,
  strokeWidth = 1.9,
}: {
  icon: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = categoryIcon(icon);
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

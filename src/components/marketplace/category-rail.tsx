"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CATEGORIES } from "@/lib/data/categories";
import { cn } from "@/lib/utils";

/**
 * Category shortcuts. On phones this is a two-row snap rail (thumb-friendly,
 * no wasted vertical space); from `sm` up it becomes a grid.
 */
export function CategoryRail({
  activeSlug,
  className,
  variant = "rail",
}: {
  activeSlug?: string | null;
  className?: string;
  variant?: "rail" | "grid";
}) {
  const categories = CATEGORIES.filter((c) => c.is_active);

  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6", className)}>
        {categories.map((c) => (
          <CategoryTile key={c.id} slug={c.slug} name={c.name} icon={c.icon} active={activeSlug === c.slug} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("no-scrollbar snap-rail -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      <div className="grid w-max grid-flow-col grid-rows-2 gap-2.5 sm:hidden">
        {categories.map((c) => (
          <span key={c.id} className="snap-item">
            <CategoryTile slug={c.slug} name={c.name} icon={c.icon} active={activeSlug === c.slug} compact />
          </span>
        ))}
      </div>
      <div className="hidden grid-cols-4 gap-2.5 sm:grid lg:grid-cols-6">
        {categories.map((c) => (
          <CategoryTile key={c.id} slug={c.slug} name={c.name} icon={c.icon} active={activeSlug === c.slug} />
        ))}
      </div>
    </div>
  );
}

function CategoryTile({
  slug,
  name,
  icon,
  active,
  compact,
}: {
  slug: string;
  name: string;
  icon: string;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/search?category=${slug}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border bg-surface px-3 py-2.5 transition-all duration-150 active:scale-[0.98]",
        compact ? "w-[142px]" : "w-full",
        active
          ? "border-brand-500 bg-brand-50 shadow-[0_0_0_1px_rgba(108,77,255,0.35)]"
          : "border-line hover:border-brand-200 hover:shadow-card",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600",
        )}
      >
        <CategoryIcon icon={icon} className="h-[18px] w-[18px]" />
      </span>
      <span
        className={cn(
          "truncate text-[13.5px] font-semibold tracking-[-0.01em]",
          active ? "text-brand-700" : "text-ink",
        )}
      >
        {name}
      </span>
    </Link>
  );
}

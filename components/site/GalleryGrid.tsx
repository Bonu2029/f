'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ComparisonSlider } from '@/components/ui/ComparisonSlider';
import { Badge } from '@/components/ui/Primitives';
import { EmptyState } from '@/components/ui/States';
import { galleryFilters, galleryItems, type GalleryFilter } from '@/lib/content/gallery';
import { cn } from '@/lib/utils';

export function GalleryGrid() {
  const [filter, setFilter] = useState<GalleryFilter | 'all'>('all');
  const reduce = useReducedMotion();

  const items =
    filter === 'all'
      ? galleryItems
      : galleryItems.filter((item) => item.filters.includes(filter));

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter transformations">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          All
        </FilterChip>
        {galleryFilters.map((option) => (
          <FilterChip
            key={option.id}
            active={filter === option.id}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        Showing {items.length} of {galleryItems.length} examples.
      </p>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon="camera"
            title="Nothing in this category yet"
            body="We publish customer work only with written permission, so some categories fill in slowly. Try another filter in the meantime."
            action={<Button onClick={() => setFilter('all')} variant="secondary">Show everything</Button>}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.article
                key={item.id}
                layout
                initial={reduce ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[2rem] border border-line bg-white p-5 shadow-soft sm:p-6"
              >
                <ComparisonSlider imageId={item.imageId} />
                <div className="mt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="outline">Demonstration example</Badge>
                    <Badge tone="mint">{item.serviceType}</Badge>
                  </div>
                  <h3 className="mt-3 text-xl">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">
                    {item.description}
                  </p>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Approximate duration</dt>
                      <dd className="text-ink">{item.duration}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Areas addressed</dt>
                      <dd className="text-ink">{item.areas.join(', ')}</dd>
                    </div>
                  </dl>
                  <Button href={item.serviceHref} variant="quiet" className="mt-4">
                    See this service →
                  </Button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-4 py-2 text-sm transition-all duration-300',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-line bg-white text-ink hover:border-sage hover:bg-mint/20',
      )}
    >
      {children}
    </button>
  );
}

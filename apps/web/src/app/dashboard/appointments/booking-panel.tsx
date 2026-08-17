'use client';

import { useRouter } from 'next/navigation';
import { SlotPicker, type OfferedSlot } from '@/components/dashboard/slot-picker';

/**
 * Keeps the chosen service in the URL.
 *
 * Availability is computed on the server from the tenant's own rows, so
 * changing the filter has to go back to the server. Putting it in the query
 * string also makes a particular view shareable and survives a refresh.
 */
export function BookingPanel(props: {
  slots: OfferedSlot[];
  employeeNames: Record<string, string>;
  timezone: string;
  durationMinutes: number;
  emptyReason: string | null;
  services: Array<{ id: string; name: string }>;
  selectedServiceId: string;
}) {
  const router = useRouter();

  return (
    <SlotPicker
      {...props}
      onServiceChange={(id) =>
        router.push(id ? `/dashboard/appointments?service=${encodeURIComponent(id)}` : '/dashboard/appointments')
      }
    />
  );
}

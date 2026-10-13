'use client';

import HydrationHistoryItem from '@/components/nutri/hidratacao/HydrationHistoryItem';
import type { HydrationDayView } from '@/lib/nutri/hidratacao/hydrationTypes';

type HydrationHistoryProps = {
  days: HydrationDayView[];
};

export default function HydrationHistory({ days }: HydrationHistoryProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Histórico de hidratação</h3>
      <ul className="space-y-2">
        {days.map((day) => (
          <HydrationHistoryItem key={day.date} date={day.date} record={day.record} />
        ))}
      </ul>
    </section>
  );
}

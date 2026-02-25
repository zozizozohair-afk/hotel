'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RoomStatusGrid, Unit } from './RoomStatusGrid';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

function toYMD(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function formatDayLabel(d: Date) {
  const w = d.toLocaleDateString('ar-EG', { weekday: 'short' });
  const day = d.getDate();
  return { w, day };
}

export default function RoomStatusWithDate({ initialUnits }: { initialUnits: Unit[] }) {
  const [selectedDate, setSelectedDate] = useState<string>(toYMD(new Date()));
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [loading, setLoading] = useState(false);
  const [tempResTotalCount, setTempResTotalCount] = useState<number>(0);
  const [tempResCountMap, setTempResCountMap] = useState<Map<string, number>>(new Map());
  const [tempResDates, setTempResDates] = useState<string[]>([]);
  const todayBase = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const daysRange = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -7; i <= 7; i++) {
      const d = new Date(todayBase);
      d.setDate(todayBase.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [todayBase]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data: unitsData } = await supabase
          .from('units')
          .select('id, unit_number, status')
          .order('unit_number');

        const { data: activeForDate } = await supabase
          .from('bookings')
          .select('id, unit_id, status, customers(full_name, phone)')
          .lte('check_in', selectedDate)
          .gt('check_out', selectedDate)
          .in('status', ['confirmed', 'checked_in']);

        const { data: arrivals } = await supabase
          .from('bookings')
          .select('id, unit_id, customers(full_name, phone)')
          .eq('status', 'confirmed')
          .eq('check_in', selectedDate);

        const { data: departures } = await supabase
          .from('bookings')
          .select('id, unit_id, customers(full_name, phone)')
          .eq('status', 'checked_in')
          .eq('check_out', selectedDate);

        const { data: overdue } = await supabase
          .from('bookings')
          .select('id, unit_id, customers(full_name, phone)')
          .eq('status', 'checked_in')
          .lt('check_out', selectedDate);

        const activeMap = new Map<string, { id: string; guest: string }>();
        (activeForDate || []).forEach((b: any) => {
          if (b.unit_id) {
            const guestName = Array.isArray(b.customers)
              ? b.customers[0]?.full_name
              : (b.customers as any)?.full_name || 'غير معروف';
            activeMap.set(b.unit_id, { id: b.id, guest: guestName });
          }
        });

        const actionMap = new Map<string, { action: 'arrival' | 'departure' | 'overdue'; guest: string; phone?: string }>();
        (arrivals || []).forEach((b: any) => {
          if (b.unit_id) {
            const guestName = Array.isArray(b.customers)
              ? b.customers[0]?.full_name
              : (b.customers as any)?.full_name || 'غير معروف';
            const phone = Array.isArray(b.customers) ? b.customers[0]?.phone : (b.customers as any)?.phone;
            actionMap.set(b.unit_id, { action: 'arrival', guest: guestName, phone });
          }
        });
        (departures || []).forEach((b: any) => {
          if (b.unit_id) {
            const guestName = Array.isArray(b.customers)
              ? b.customers[0]?.full_name
              : (b.customers as any)?.full_name || 'غير معروف';
            const phone = Array.isArray(b.customers) ? b.customers[0]?.phone : (b.customers as any)?.phone;
            actionMap.set(b.unit_id, { action: 'departure', guest: guestName, phone });
          }
        });
        (overdue || []).forEach((b: any) => {
          if (b.unit_id) {
            const guestName = Array.isArray(b.customers)
              ? b.customers[0]?.full_name
              : (b.customers as any)?.full_name || 'غير معروف';
            const phone = Array.isArray(b.customers) ? b.customers[0]?.phone : (b.customers as any)?.phone;
            actionMap.set(b.unit_id, { action: 'overdue', guest: guestName, phone });
          }
        });

        const mapped: Unit[] = (unitsData || []).map((u: any) => {
          const active = activeMap.get(u.id);
          const action = actionMap.get(u.id);
          let status = u.status;
          if (active) {
            status = 'occupied';
          } else {
            if (!['maintenance', 'cleaning'].includes(status)) status = 'available';
          }
          return {
            id: u.id,
            unit_number: u.unit_number,
            status,
            booking_id: active?.id || undefined,
            guest_name: active?.guest || action?.guest,
            next_action: action?.action || null,
            action_guest_name: action?.guest,
            guest_phone: action?.phone,
          };
        });

        {
          const unitIds = (unitsData || []).map((u: any) => u.id);
          const { data: tempRes } = await supabase
            .from('temporary_reservations')
            .select('unit_id, customer_name, reserve_date, phone')
            .eq('reserve_date', selectedDate)
            .in('unit_id', unitIds);
          const tempMap = new Map<string, any>();
          (tempRes || []).forEach((t: any) => tempMap.set(t.unit_id, t));
          for (let i = 0; i < mapped.length; i++) {
            const t = tempMap.get(mapped[i].id);
            if (t) {
              mapped[i] = {
                ...mapped[i],
                has_temp_res: true,
                action_guest_name: t.customer_name,
                guest_phone: t.phone,
              };
            }
          }
        }

        if (mounted) setUnits(mapped);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const btn = el.querySelector<HTMLButtonElement>(`button[data-date="${selectedDate}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedDate]);

  const stripRef = useRef<HTMLDivElement | null>(null);

  const scrollStrip = (dir: 'left' | 'right') => {
    const el = stripRef.current;
    if (!el) return;
    const delta = Math.floor(el.clientWidth * 0.8) * (dir === 'left' ? -1 : 1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Fixed window around اليوم — لا توسيع تلقائي
  useEffect(() => {
    const fetchTempReservationsRange = async () => {
      try {
        const start = toYMD(daysRange[0]);
        const end = toYMD(daysRange[daysRange.length - 1]);
        const { data } = await supabase
          .from('temporary_reservations')
          .select('reserve_date')
          .gte('reserve_date', start)
          .lte('reserve_date', end);
        const map = new Map<string, number>();
        (data || []).forEach((r: any) => {
          const d = r.reserve_date as string;
          map.set(d, (map.get(d) || 0) + 1);
        });
        const dates = Array.from(map.keys()).sort();
        if (mounted) {
          setTempResTotalCount((data || []).length);
          setTempResCountMap(map);
          setTempResDates(dates);
        }
      } catch (err) {
        console.error('Fetch temp reservations range error:', err);
      }
    };
    let mounted = true;
    fetchTempReservationsRange();
    return () => { mounted = false; };
  }, [daysRange]);

  const jumpToNextTempDate = () => {
    if (tempResDates.length === 0) return;
    const idx = tempResDates.indexOf(selectedDate);
    if (idx === -1) {
      setSelectedDate(tempResDates[0]);
      return;
    }
    const nextIdx = (idx + 1) % tempResDates.length;
    setSelectedDate(tempResDates[nextIdx]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarIcon size={18} className="text-blue-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSelectedDate(toYMD(new Date()))}
            className="px-2.5 py-1.5 text-xs rounded-lg border bg-white hover:bg-blue-50 text-gray-700"
            aria-label="اليوم"
          >
            اليوم
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              setSelectedDate(toYMD(d));
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border bg-white hover:bg-blue-50 text-gray-700"
            aria-label="غداً"
          >
            غداً
          </button>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setSelectedDate(toYMD(d));
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border bg-white hover:bg-blue-50 text-gray-700"
            aria-label="أمس"
          >
            أمس
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-full">
          <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 z-10">
            <button
              onClick={() => scrollStrip('left')}
              className="p-1.5 rounded-full bg-white border shadow hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 z-10">
            <button
              onClick={() => scrollStrip('right')}
              className="p-1.5 rounded-full bg-white border shadow hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 edge-fade">
            <div
              ref={stripRef}
              className="no-scrollbar flex gap-1 overflow-x-auto overflow-y-hidden pb-1 snap-x snap-mandatory px-1"
            >
          {daysRange.map((d) => {
            const ymd = toYMD(d);
            const { w, day } = formatDayLabel(d);
            const active = selectedDate === ymd;
                const todayYMD = toYMD(new Date(todayBase));
                const yesterday = (() => { const t = new Date(todayBase); t.setDate(t.getDate() - 1); return toYMD(t); })();
                const tomorrow = (() => { const t = new Date(todayBase); t.setDate(t.getDate() + 1); return toYMD(t); })();
                let rel: string | null = null;
                if (ymd === todayYMD) rel = 'اليوم';
                else if (ymd === yesterday) rel = 'أمس';
                else if (ymd === tomorrow) rel = 'غداً';
            return (
              <button
                key={ymd}
                    data-date={ymd}
                onClick={() => setSelectedDate(ymd)}
                className={cn(
                      'min-w-[48px] sm:min-w-[60px] md:min-w-[64px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-center transition-colors snap-center',
                  active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-blue-50'
                )}
                title={d.toLocaleDateString('ar-EG', { dateStyle: 'full' })}
              >
                    <div className="relative">
                      {rel && (
                        <span className="absolute top-0 right-0 translate-y-[-4px] translate-x-1 text-[9px] font-bold text-blue-600/80">
                          {rel}
                        </span>
                      )}
                      <div className="text-[9px] sm:text-[10px] md:text-[11px] font-medium">{w}</div>
                      <div className="text-sm sm:text-base md:text-lg font-bold font-sans">{day}</div>
                    </div>
              </button>
            );
          })}
            </div>
          </div>
        </div>
      </div>
      <div className={cn(loading && 'opacity-60 pointer-events-none')}>
        <RoomStatusGrid 
          units={units} 
          dateLabel={new Date(selectedDate).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          tempResTotalCount={tempResTotalCount}
          onJumpTempDate={jumpToNextTempDate}
        />
      </div>
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .edge-fade {
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
                  mask-image: linear-gradient(to right, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
        }
        @media (min-width: 640px) {
          .edge-fade {
            -webkit-mask-image: linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
                    mask-image: linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
          }
        }
        @media (min-width: 768px) {
          .edge-fade {
            -webkit-mask-image: linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
                    mask-image: linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
          }
        }
      `}</style>
    </div>
  );
}

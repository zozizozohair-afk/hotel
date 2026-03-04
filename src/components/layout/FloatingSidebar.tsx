'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Menu, X,
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  FileText,
  CreditCard,
  List as ListIcon,
  ScrollText,
  Wrench,
  Brush,
  Bell,
  Layers,
  Settings
} from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

export default function FloatingSidebar() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return { x: w - 80, y: h - 120 };
  });
  const dragging = useRef(false);
  const offset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const { role } = useUserRole();
  const isReceptionist = role === 'receptionist';
  const isHousekeeping = role === 'housekeeping';

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const nx = e.clientX - offset.current.x;
      const ny = e.clientY - offset.current.y;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const clampedX = Math.max(8, Math.min(nx, w - 72));
      const clampedY = Math.max(8, Math.min(ny, h - 72));
      setPos({ x: clampedX, y: clampedY });
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const onDown = (e: React.PointerEvent) => {
    if (!btnRef.current) return;
    dragging.current = true;
    const rect = btnRef.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.body.style.userSelect = 'none';
  };

  const openUp = typeof window !== 'undefined' ? pos.y > window.innerHeight / 2 : false;

  return (
    <div className="hidden lg:block 2xl:hidden">
      <button
        ref={btnRef}
        onPointerDown={onDown}
        onClick={() => setOpen(v => !v)}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-2xl flex items-center justify-center active:scale-95 transition-transform"
        aria-label="القائمة"
      >
        {open ? <X /> : <Menu />}
      </button>

      {open && (() => {
        const ww = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const wh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const menuW = 256;
        const menuH = Math.floor(wh * 0.6);
        const minX = 8 + menuW / 2;
        const maxX = ww - 8 - menuW / 2;
        const left = Math.max(minX, Math.min(pos.x, maxX));
        if (openUp) {
          const bottom = Math.max(8, wh - pos.y);
          return (
            <div
              style={{ left, bottom, transform: 'translateX(-50%)' }}
              className="fixed z-50 w-64 max-h-[60vh] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-b border-gray-100">
                <div className="text-xs font-bold text-gray-600 text-center">القائمة</div>
              </div>
              <div className="max-h-[55vh] overflow-y-auto p-2">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    isHousekeeping
                      ? [
                          { href: '/maintenance', label: 'صيانة', icon: Wrench },
                          { href: '/cleaning', label: 'تنظيف', icon: Brush }
                        ]
                      : isReceptionist
                      ? [
                          { href: '/', label: 'لوحة', icon: LayoutDashboard },
                          { href: '/invoices', label: 'فواتير', icon: FileText },
                          { href: '/payments', label: 'مدفوعات', icon: CreditCard },
                          { href: '/customers', label: 'عملاء', icon: Users },
                          { href: '/booking-intake', label: 'تعبئة', icon: ScrollText },
                          { href: '/notifications', label: 'تنبيهات', icon: Bell },
                          { href: '/documents-archive', label: 'وثائق', icon: FileText },
                          { href: '/maintenance', label: 'صيانة', icon: Wrench },
                          { href: '/cleaning', label: 'تنظيف', icon: Brush }
                        ]
                      : [
                          { href: '/', label: 'لوحة', icon: LayoutDashboard },
                          { href: '/bookings', label: 'حجز', icon: CalendarDays },
                          { href: '/bookings-list', label: 'السجل', icon: ListIcon },
                          { href: '/units', label: 'الوحدات', icon: BedDouble },
                          { href: '/invoices', label: 'فواتير', icon: FileText },
                          { href: '/payments', label: 'مدفوعات', icon: CreditCard },
                          { href: '/customers', label: 'عملاء', icon: Users },
                          { href: '/templates', label: 'تمبلت', icon: ScrollText },
                          { href: '/documents-archive', label: 'وثائق', icon: FileText },
                          { href: '/maintenance', label: 'صيانة', icon: Wrench },
                          { href: '/cleaning', label: 'تنظيف', icon: Brush },
                          { href: '/notifications', label: 'تنبيهات', icon: Bell }
                        ]
                  ).map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                        <Icon size={18} />
                      </div>
                      <div className="text-[11px] font-medium">{label}</div>
                    </Link>
                  ))}
                  {!isReceptionist && !isHousekeeping && (
                    <Link
                      href="/group-bookings"
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                        <Layers size={18} />
                      </div>
                      <div className="text-[11px] font-medium">جماعي</div>
                    </Link>
                  )}
                  {!isReceptionist && !isHousekeeping && (
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                        <Settings size={18} />
                      </div>
                      <div className="text-[11px] font-medium">الإعدادات</div>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        } else {
          const maxTop = wh - 8 - menuH;
          const top = Math.max(8, Math.min(pos.y + 72, maxTop));
          return (
            <div
              style={{ left, top, transform: 'translateX(-50%)' }}
              className="fixed z-50 w-64 max-h-[60vh] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-2 border-t border-gray-100">
                <div className="text-xs font-bold text-gray-600 text-center">القائمة</div>
              </div>
              <div className="max-h-[55vh] overflow-y-auto p-2">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    isHousekeeping
                      ? [
                          { href: '/maintenance', label: 'صيانة', icon: Wrench },
                          { href: '/cleaning', label: 'تنظيف', icon: Brush }
                        ]
                      : isReceptionist
                      ? [
                          { href: '/', label: 'لوحة', icon: LayoutDashboard },
                          { href: '/invoices', label: 'فواتير', icon: FileText },
                          { href: '/payments', label: 'مدفوعات', icon: CreditCard },
                          { href: '/customers', label: 'عملاء', icon: Users },
                          { href: '/booking-intake', label: 'تعبئة', icon: ScrollText },
                          { href: '/notifications', label: 'تنبيهات', icon: Bell },
                          { href: '/documents-archive', label: 'وثائق', icon: FileText },
                          { href: '/maintenance', label: 'صيانة', icon: Wrench },
                          { href: '/cleaning', label: 'تنظيف', icon: Brush }
                        ]
                      : [
                          { href: '/', label: 'لوحة', icon: LayoutDashboard },
                          { href: '/bookings', label: 'حجز', icon: CalendarDays },
                          { href: '/bookings-list', label: 'السجل', icon: ListIcon },
                          { href: '/units', label: 'الوحدات', icon: BedDouble },
                          { href: '/invoices', label: 'فواتير', icon: FileText },
                          { href: '/payments', label: 'مدفوعات', icon: CreditCard },
                          { href: '/customers', label: 'عملاء', icon: Users },
                          { href: '/templates', label: 'تمبلت', icon: ScrollText },
                          { href: '/documents-archive', label: 'وثائق', icon: FileText },
                          { href: '/maintenance', label: 'صيانة', icon: Wrench },
                          { href: '/cleaning', label: 'تنظيف', icon: Brush },
                          { href: '/notifications', label: 'تنبيهات', icon: Bell }
                        ]
                  ).map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                        <Icon size={18} />
                      </div>
                      <div className="text-[11px] font-medium">{label}</div>
                    </Link>
                  ))}
                  {!isReceptionist && !isHousekeeping && (
                    <Link
                      href="/group-bookings"
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                        <Layers size={18} />
                      </div>
                      <div className="text-[11px] font-medium">جماعي</div>
                    </Link>
                  )}
                  {!isReceptionist && !isHousekeeping && (
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700">
                        <Settings size={18} />
                      </div>
                      <div className="text-[11px] font-medium">الإعدادات</div>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        }
      })()}
    </div>
  );
}

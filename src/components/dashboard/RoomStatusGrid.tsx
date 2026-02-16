'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BedDouble, Wrench, Sparkles, User, LogOut, LogIn, AlertTriangle, Calendar } from 'lucide-react';

export interface Unit {
  id: string;
  unit_number: string;
  status: string;
  booking_id?: string;
  guest_name?: string;
  next_action?: 'arrival' | 'departure' | 'overdue' | null;
  action_guest_name?: string;
  guest_phone?: string;
}

export const RoomStatusGrid = ({ units, dateLabel }: { units: Unit[], dateLabel?: string }) => {
    const [filter, setFilter] = useState<'all' | 'arrival' | 'departure' | 'overdue'>('all');
    const router = useRouter();

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'available': return {
                wrapper: 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-100',
                icon: 'text-emerald-500',
                text: 'text-emerald-700',
                label: 'متاح',
                Icon: BedDouble
            };
            case 'occupied': return {
                wrapper: 'bg-blue-50/50 hover:bg-blue-50 border-blue-100',
                icon: 'text-blue-500',
                text: 'text-blue-700',
                label: 'مشغول',
                Icon: User
            };
            case 'cleaning': return {
                wrapper: 'bg-amber-50/50 hover:bg-amber-50 border-amber-100',
                icon: 'text-amber-500',
                text: 'text-amber-700',
                label: 'تنظيف',
                Icon: Sparkles
            };
            case 'maintenance': return {
                wrapper: 'bg-rose-50/50 hover:bg-rose-50 border-rose-100',
                icon: 'text-rose-500',
                text: 'text-rose-700',
                label: 'صيانة',
                Icon: Wrench
            };
            default: return {
                wrapper: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
                icon: 'text-gray-500',
                text: 'text-gray-700',
                label: status,
                Icon: BedDouble
            };
        }
    };

    const getActionBadge = (unit: Unit) => {
        if (unit.next_action === 'overdue') {
             return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'تجاوز', animate: true };
        }
        if (unit.next_action === 'departure') {
             return { icon: LogOut, color: 'text-orange-600', bg: 'bg-orange-100', label: 'خروج' };
        }
        if (unit.next_action === 'arrival') {
             return { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100', label: 'وصول' };
        }
        return null;
    };

    // Calculate stats
    const stats = {
        total: units.length,
        available: units.filter(u => u.status === 'available').length,
        occupied: units.filter(u => u.status === 'occupied').length,
        maintenance: units.filter(u => ['maintenance', 'cleaning'].includes(u.status)).length,
        
        // Action stats
        arrival: units.filter(u => u.next_action === 'arrival').length,
        departure: units.filter(u => u.next_action === 'departure').length,
        overdue: units.filter(u => u.next_action === 'overdue').length
    };

    const filteredUnits = units.filter(u => {
        if (filter === 'all') return true;
        return u.next_action === filter;
    });

    const labelText = dateLabel || new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                            حالة الغرف
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex items-center gap-1">
                                <Calendar size={12} />
                                {labelText}
                            </span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            <span className="font-medium text-emerald-600">{stats.available} متاح</span> • 
                            <span className="font-medium text-blue-600 mx-1">{stats.occupied} مشغول</span> • 
                            <span className="font-medium text-amber-600">{stats.maintenance} غير جاهز</span>
                        </p>
                    </div>
                </div>

                {/* Filters / Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button 
                        onClick={() => setFilter('all')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                            filter === 'all' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        الكل ({units.length})
                    </button>
                    <button 
                        onClick={() => setFilter('overdue')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                            filter === 'overdue' ? "bg-red-100 text-red-700 ring-1 ring-red-200" : "bg-gray-50 text-gray-600 hover:bg-red-50"
                        )}
                    >
                        <AlertTriangle size={14} className={filter === 'overdue' ? "text-red-600" : "text-gray-400"} />
                        تجاوز الخروج
                        {stats.overdue > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 rounded-full">{stats.overdue}</span>}
                    </button>
                    <button 
                        onClick={() => setFilter('departure')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                            filter === 'departure' ? "bg-orange-100 text-orange-700 ring-1 ring-orange-200" : "bg-gray-50 text-gray-600 hover:bg-orange-50"
                        )}
                    >
                        <LogOut size={14} className={filter === 'departure' ? "text-orange-600" : "text-gray-400"} />
                        مغادرة اليوم
                        {stats.departure > 0 && <span className="bg-orange-600 text-white text-[10px] px-1.5 rounded-full">{stats.departure}</span>}
                    </button>
                    <button 
                        onClick={() => setFilter('arrival')}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                            filter === 'arrival' ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200" : "bg-gray-50 text-gray-600 hover:bg-blue-50"
                        )}
                    >
                        <LogIn size={14} className={filter === 'arrival' ? "text-blue-600" : "text-gray-400"} />
                        وصول اليوم
                        {stats.arrival > 0 && <span className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full">{stats.arrival}</span>}
                    </button>
                </div>
            </div>

            {filteredUnits.length === 0 ? (
                 <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed">
                    <BedDouble size={48} className="mb-3 opacity-20" />
                    <p>لا توجد وحدات تطابق الفلتر</p>
                 </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 content-start">
                    {filteredUnits.map((unit) => {
                        const style = getStatusStyle(unit.status);
                        const StatusIcon = style.Icon;
                        const actionBadge = getActionBadge(unit);
                        const ActionIcon = actionBadge?.icon;
                        
                        const hasBooking = Boolean(unit.booking_id);

                        return (
                            <div 
                                key={unit.id} 
                                className={cn(
                                    "group relative p-3 rounded-xl border transition-all duration-200 flex flex-col items-center text-center gap-2 hover:shadow-md hover:-translate-y-0.5 min-h-[100px]",
                                    hasBooking && "cursor-pointer",
                                    style.wrapper,
                                    actionBadge && "ring-2 ring-offset-1",
                                    unit.next_action === 'overdue' && "ring-red-500/50",
                                    unit.next_action === 'departure' && "ring-orange-500/50",
                                    unit.next_action === 'arrival' && "ring-blue-500/50"
                                )}
                                onClick={() => {
                                    if (unit.booking_id) {
                                        router.push(`/bookings-list/${unit.booking_id}`);
                                    }
                                }}
                                title={unit.guest_name || style.label}
                            >
                                {/* Status Header */}
                                <div className="flex items-center justify-between w-full">
                                    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/60 backdrop-blur-sm", style.text)}>
                                        {style.label}
                                    </span>
                                    <StatusIcon size={14} className={style.icon} />
                                </div>
                                
                                {/* Unit Number */}
                                <span className="font-bold text-lg font-sans text-gray-800 group-hover:scale-110 transition-transform mt-1">
                                    {unit.unit_number}
                                </span>
                                
                                {/* Guest Name or Action Badge */}
                                <div className="w-full mt-auto space-y-1">
                                    {/* Action Badge if exists */}
                                    {actionBadge && ActionIcon && (
                                        <div className={cn(
                                            "w-full py-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1", 
                                            actionBadge.bg, 
                                            actionBadge.color,
                                            // @ts-ignore
                                            actionBadge.animate && "animate-pulse"
                                        )}>
                                            <ActionIcon size={10} />
                                            {actionBadge.label}
                                        </div>
                                    )}

                                    {/* Guest Name */}
                                    {(unit.guest_name || unit.action_guest_name) && (
                                        <div className={cn("w-full pt-1 border-t", unit.status === 'occupied' ? "border-blue-200/50" : "border-gray-200/50")}>
                                            <p className="text-[10px] font-medium truncate w-full text-gray-600">
                                                {unit.guest_name || unit.action_guest_name || 'ضيف'}
                                            </p>
                                            {unit.guest_phone && (
                                                <p className="text-[9px] text-gray-400 font-mono truncate dir-ltr">
                                                    {unit.guest_phone}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

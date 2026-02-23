'use client';

import React, { useMemo, useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';

export default function PrintActions() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'normal' | 'custom'>('normal');
  const [text, setText] = useState('');
  const currentNote = useMemo(() => {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get('rentNote') || '';
    } catch {
      return '';
    }
  }, []);

  const apply = () => {
    const url = new URL(window.location.href);
    if (mode === 'normal') {
      url.searchParams.delete('rentNote');
    } else {
      url.searchParams.set('rentNote', text.trim());
    }
    window.location.href = url.toString();
  };

  return (
    <div className="fixed top-6 right-6 z-50 print:hidden flex flex-col gap-3 items-end">
      <button 
        onClick={() => window.print()} 
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
      >
        <Printer size={20} />
        طباعة / حفظ PDF
      </button>

      <div className="relative">
        <button
          onClick={() => {
            setOpen((v) => !v);
            setMode(currentNote ? 'custom' : 'normal');
            setText(currentNote || '');
          }}
          className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
        >
          <ChevronDown size={18} />
          تخصيص الأجرة
        </button>

        {open && (
          <div className="absolute mt-2 right-0 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-3">
            <div className="space-y-3">
              <div className="text-sm font-bold text-gray-900">قسم الأجرة</div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value === 'custom' ? 'custom' : 'normal')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="normal">عادية (بدون تغيير)</option>
                <option value="custom">تعديل النص</option>
              </select>
              {mode === 'custom' && (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب النص المراد عرضه في الأجرة"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={3}
                />
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-bold"
                >
                  إغلاق
                </button>
                <button
                  onClick={apply}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                >
                  تطبيق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

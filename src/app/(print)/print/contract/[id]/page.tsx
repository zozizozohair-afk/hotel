 

import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { format, differenceInYears, differenceInMonths, differenceInCalendarDays, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import Logo from '@/components/Logo';
import PrintActions from '../../PrintActions';

export const runtime = 'edge';

// نسخة تصميم رسمي مضغوط لصفحة عقد — مناسبة للطباعة في صفحة A4 واحدة
// استخدم Tailwind + print styles

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customers(*),
      unit:units(
        *,
        unit_type:unit_types(*)
      )
    `)
    .eq('id', id)
    .single();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, invoice_date')
    .eq('booking_id', id)
    .order('created_at', { ascending: false });
  const today = format(new Date(), 'dd/MM/yyyy', { locale: ar });
  const mainInvoice =
    invoices?.find((inv: any) => !inv?.invoice_number?.includes('-EXT-')) ||
    invoices?.[0];
  const invoiceNumber = mainInvoice?.invoice_number;
  const annualPrice = booking?.unit?.unit_type?.annual_price || 0;
  const dailyPrice = booking?.unit?.unit_type?.daily_price || 0;
  const monthlyRent = annualPrice ? Math.round(annualPrice / 12) : (dailyPrice ? Math.round(dailyPrice * 30) : null);
  const periodStart = booking?.check_in ? format(new Date(booking.check_in), 'dd/MM/yyyy', { locale: ar }) : null;
  const periodEnd = booking?.check_out ? format(new Date(booking.check_out), 'dd/MM/yyyy', { locale: ar }) : null;
  const isAnnualContract = (() => {
    if (!booking?.check_in || !booking?.check_out) return false;
    const monthsTotal = Math.max(0, differenceInMonths(new Date(booking.check_out), new Date(booking.check_in)));
    return monthsTotal >= 12;
  })();
  const yearlyRent = booking?.unit?.unit_type?.annual_price
    ? Math.round(Number(booking.unit.unit_type.annual_price))
    : (monthlyRent != null ? monthlyRent * 12 : null);
  const depositOneMonth = monthlyRent != null ? monthlyRent : null;
  const isDailyBooking = booking?.booking_type === 'nightly' || booking?.booking_type === 'daily';
  const durationText = (() => {
    if (!booking?.check_in || !booking?.check_out) return null;
    const start = new Date(booking.check_in);
    const end = new Date(booking.check_out);
    const years = Math.max(0, differenceInYears(end, start));
    const monthsTotal = Math.max(0, differenceInMonths(end, start));
    const months = Math.max(0, monthsTotal - years * 12);
    const days = Math.max(0, differenceInCalendarDays(end, addMonths(start, years * 12 + months)));
    const parts: string[] = [];
    const yPart = years === 0 ? null : (years === 1 ? 'سنة واحدة' : years === 2 ? 'سنتان' : `${years} سنوات`);
    const mPart = months === 0 ? null : (months === 1 ? 'شهر واحد' : months === 2 ? 'شهران' : `${months} أشهر`);
    const dPart = days === 0 ? null : (days === 1 ? 'يوم واحد' : days === 2 ? 'يومان' : `${days} أيام`);
    if (yPart) parts.push(yPart);
    if (mPart) parts.push(mPart);
    if (dPart) parts.push(dPart);
    return parts.length > 0 ? parts.join(' و ') : null;
  })();
  let depositAmount: number | null = null;
  if (invoices && invoices.length > 0) {
    const invoiceIds = invoices.map((i: any) => i.id);
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, payment_date, invoice_id')
      .in('invoice_id', invoiceIds)
      .order('payment_date', { ascending: true });
    depositAmount = (payments && payments.length > 0) ? Math.round(Number(payments[0].amount) || 0) : null;
  }

  return (
    <div
      dir="rtl"
      className="bg-gray-100 min-h-screen py-8 print:bg-white print:py-0 print:m-0 print:min-h-0"
    >
      <style>{`@media print { @page { size: A4; margin: 8mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
      {/* A4 Container */}
      <div className="mx-auto bg-white box-border w-full max-w-[194mm] min-h-[281mm] shadow-lg print:shadow-none p-[8mm] print:p-[8mm] text-[12.5px] leading-relaxed text-gray-900 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
          <span className="font-extrabold text-gray-900/6 print:text-gray-900/8 tracking-widest rotate-[45deg] text-[28mm] whitespace-nowrap leading-none">
            مساكن الصفا
          </span>
        </div>
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                <Logo className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">عقد إيجار شهري</h1>
                <p className="text-xs text-gray-600">وحدة سكنية مفروشة</p>
              </div>
            </div>

            <div className="text-left space-y-1 text-xs font-semibold">
              <p>
                رقم العقد: 
                <span className="font-mono">
                  {booking?.id?.slice(0, 8)?.toUpperCase()}
                </span>
              </p>
              <p>تاريخ التحرير: {today}</p>
              {invoiceNumber && <p>رقم الفاتورة: {invoiceNumber}</p>}
              <p>
                السجل التجاري:{' '}
                <span className="font-mono font-bold">7027279632</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
          <p className="font-semibold text-gray-900">بيان رسمي</p>
          <p>تصدر هذه الوثيقة عن شركة شموخ الرفاهية الفندقية – مساكن الصفا، وتم إعدادها وفقاً للأنظمة المرعية، وتُعد مرجعاً ملزماً للطرفين.</p>
          <p>تلتزم المنشأة بتقديم مستوى ضيافة رفيع ومعايير جودة ثابتة، ويؤكد الطرفان التزامهما بجميع البنود الواردة.</p>
        </div>

        {/* Parties */}
        <section className="mb-4 grid grid-cols-2 gap-6 border border-gray-300 rounded-lg p-3">
          <div>
            <h2 className="font-bold mb-2 text-sm">المؤجر</h2>
            <p>شركة شموخ الرفاهية الفندقية</p>
          </div>
          <div>
            <h2 className="font-bold mb-2 text-sm">المستأجر</h2>
            <p>الاسم: {booking?.customer?.full_name || '—'}</p>
            <p>الهوية: {booking?.customer?.national_id || '—'}</p>
            <p>الجوال: {booking?.customer?.phone || '—'}</p>
          </div>
        </section>

        {/* Unit Info */}
        <section className="mb-4 border border-gray-300 rounded-lg p-3">
          <h2 className="font-bold mb-2 text-sm">بيانات الوحدة</h2>
          <div className="grid grid-cols-3 gap-3">
            <p>
              رقم الوحدة: <span className="font-mono">{booking?.unit?.unit_number || '—'}</span>
            </p>
            <p>
              الدور: <span className="font-mono">{booking?.unit?.floor || '—'}</span>
            </p>
            <p>الاستخدام: سكني فقط</p>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            النموذج: {booking?.unit?.unit_type?.name || '—'}
            {booking?.unit?.unit_type?.description ? (
              <> — {booking?.unit?.unit_type?.description}</>
            ) : null}
          </p>
          
        </section>

        {/* Terms Grid */}
        <section className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-300 rounded-lg p-3 space-y-2">
            <h3 className="font-bold text-sm">المدة</h3>
            <p>{durationText ? `${durationText}، وتتجدد تلقائياً عند السداد.` : '—'}</p>
            {periodStart && periodEnd && (
              <p className="text-xs">
                من تاريخ <span className="font-mono font-bold" dir="ltr">{periodStart}</span>
                {' '}إلى تاريخ{' '}
                <span className="font-mono font-bold" dir="ltr">{periodEnd}</span>
              </p>
            )}

            <h3 className="font-bold text-sm pt-2">الأجرة</h3>
            {isDailyBooking ? (
              <p>
                الإيجار اليومي:{' '}
                {dailyPrice != null ? (
                  <span className="font-extrabold font-mono" dir="ltr">
                    {Number(dailyPrice).toLocaleString('en-US')}
                  </span>
                ) : (
                  '____'
                )}{' '}
                ريال
              </p>
            ) : isAnnualContract ? (
              <p>
                الإيجار السنوي:{' '}
                {yearlyRent != null ? (
                  <span className="font-extrabold font-mono" dir="ltr">
                    {yearlyRent.toLocaleString('en-US')}
                  </span>
                ) : (
                  '____'
                )}{' '}
                ريال
              </p>
            ) : (
              <p>
                الإيجار الشهري:{' '}
                {monthlyRent != null ? (
                  <span className="font-extrabold font-mono" dir="ltr">
                    {monthlyRent.toLocaleString('en-US')}
                  </span>
                ) : (
                  '____'
                )}{' '}
                ريال (شامل الخدمات)
              </p>
            )}
            {!isDailyBooking && (
              <p>
                التأمين:{' '}
                {depositOneMonth != null ? (
                  <span className="font-extrabold font-mono" dir="ltr">
                    {depositOneMonth.toLocaleString('en-US')}
                  </span>
                ) : (
                  '____'
                )}{' '}
                ريال (يعادل إيجار شهر واحد)
              </p>
            )}
          </div>

          <div className="border border-gray-300 rounded-lg p-3 space-y-2">
            <h3 className="font-bold text-sm">الصيانة</h3>
            <ul className="list-disc pr-4 space-y-1">
              <li>سوء الاستخدام على المستأجر</li>
              <li>الأعطال الفنية على المؤجر</li>
            </ul>

            <h3 className="font-bold text-sm pt-2">الإنهاء</h3>
            <p className="text-xs">
              يحق للمؤجر فسخ العقد عند التأخر بالسداد أو الإزعاج أو إساءة الاستخدام.
            </p>
          </div>
        </section>

        {/* Obligations */}
        <section className="mb-4 border border-gray-300 rounded-lg p-3">
          <h3 className="font-bold text-sm mb-2">التزامات المستأجر</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p>• يمنع التأجير من الباطن</p>
            <p>• المحافظة على الوحدة</p>
            <p>• الالتزام بالهدوء</p>
            <p>• لا يسترد المبلغ بعد بدء الشهر</p>
          </div>
        </section>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
          <p className="font-medium text-gray-900">اعتماد</p>
          <p>يعتمد هذا العقد إلكترونياً ويعامل كمستند رسمي لدى المنشأة، ويُختم باسم مساكن الصفا.</p>
        </div>

        {/* Signatures */}
        <section className="mt-8 grid grid-cols-2 gap-10 text-sm">
          <div className="text-center space-y-6">
            <p className="font-bold">المؤجر</p>
            <div className="border-b border-gray-500 h-8"></div>
            <p>الاسم / التوقيع</p>
          </div>

          <div className="text-center space-y-6">
            <p className="font-bold">المستأجر</p>
            <div className="border-b border-gray-500 h-8"></div>
            <p>الاسم / التوقيع</p>
          </div>
        </section>
      </div>

      <PrintActions />
    </div>
  );
}

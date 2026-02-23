 

import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { format, differenceInYears, differenceInMonths, differenceInCalendarDays, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import Logo from '@/components/Logo';
import PrintActions from '../../PrintActions';

export const runtime = 'edge';

// نسخة تصميم رسمي مضغوط لصفحة عقد — مناسبة للطباعة في صفحة A4 واحدة
// استخدم Tailwind + print styles

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ durationNote?: string; rentNote?: string }> }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const { durationNote, rentNote } = sp;
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
  const startDateObj = booking?.check_in ? new Date(booking.check_in) : null;
  const endDateObj = booking?.check_out ? new Date(booking.check_out) : null;
  const startDayName = startDateObj ? format(startDateObj, 'EEEE', { locale: ar }) : null;
  const endDateMinusOne = endDateObj ? new Date(endDateObj.getTime() - 24 * 60 * 60 * 1000) : null;
  const endDateMinusOneStr = endDateMinusOne ? format(endDateMinusOne, 'dd/MM/yyyy', { locale: ar }) : null;
  const isAnnualContract = (() => {
    if (!booking?.check_in || !booking?.check_out) return false;
    const monthsTotal = Math.max(0, differenceInMonths(new Date(booking.check_out), new Date(booking.check_in)));
    return monthsTotal >= 12;
  })();
  const yearlyRent = booking?.unit?.unit_type?.annual_price
    ? Math.round(Number(booking.unit.unit_type.annual_price))
    : (monthlyRent != null ? monthlyRent * 12 : null);
  const monthsTotalContract = (booking?.check_in && booking?.check_out) ? Math.max(0, differenceInMonths(new Date(booking.check_out), new Date(booking.check_in))) : 0;
  const daysTotalContract = (booking?.check_in && booking?.check_out) ? Math.max(0, differenceInCalendarDays(new Date(booking.check_out), new Date(booking.check_in))) : 0;
  const totalRent = (() => {
    if (booking?.booking_type === 'nightly' || booking?.booking_type === 'daily') {
      return booking?.total_price != null
        ? Math.round(Number(booking.total_price))
        : (dailyPrice && daysTotalContract > 0 ? Math.round(Number(dailyPrice) * daysTotalContract) : null);
    }
    return isAnnualContract
      ? yearlyRent
      : (monthlyRent != null ? monthlyRent * monthsTotalContract : null);
  })();
  const depositFixed = 500;
  const isDailyBooking = booking?.booking_type === 'nightly' || booking?.booking_type === 'daily';
  const termLabel = isDailyBooking ? 'يومي' : (isAnnualContract ? 'سنوي' : 'شهري');
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
  const qrData = `Contract:${booking?.id || ''};Customer:${booking?.customer?.full_name || ''};Unit:${booking?.unit?.unit_number || ''};From:${periodStart || ''};To:${periodEnd || ''}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

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
                <p className="text-xs text-gray-700">
              رقم الجوال <span className="font-mono" dir="ltr">0538159915</span>
            </p>
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
              
            </div>
          </div>
        </div>

        {/* Parties */}
        <section className="mb-4 grid grid-cols-2 gap-6 border border-gray-300 rounded-lg p-3">
          <div>
            <h2 className="font-bold mb-2 text-sm">المؤجر</h2>
            <p>المالك: شركة مساكن الرفاهية</p>
            <p>الممثل: شركة شموخ الرفاهية للتطوير والاستثمار العقاري</p>
            <p className="text-xs text-gray-700">السجل التجاري: <span className="font-mono font-bold">7037421299</span></p>
            
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
        <section className="grid grid-cols-1 gap-3 mb-4">
          <div className="border border-gray-300 rounded-lg p-3 space-y-2 text-[11px]">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold text-[12px]">المدة:</span>
              <span className="text-[11px]">
                مدة العقد: <span className="font-mono font-bold">{termLabel}</span>
                {durationText ? ` — ${durationText}` : ''}
                {durationNote ? ` — ${durationNote}` : ''}
                {periodStart && periodEnd ? (
                  <>
                    {' '}— من تاريخ <span className="font-mono font-bold" dir="ltr">{periodStart}</span>
                    {startDayName ? <> {' '}يوم <span className="font-mono font-bold">{startDayName}</span></> : null}
                    {' '}الساعة <span className="font-mono font-bold" dir="ltr">6 صباحاً</span>
                    {' '}— إلى تاريخ <span className="font-mono font-bold" dir="ltr">{endDateMinusOneStr || periodEnd}</span>
                    {' '}الساعة <span className="font-mono font-bold" dir="ltr">6 مساءً</span>
                  </>
                ) : null}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 pt-2">
              <span className="font-bold text-[12px]">الأجرة:</span>
              <span className="text-[11px]">
                {rentNote && rentNote.trim().length > 0 ? (
                  rentNote
                ) : (
                  <>
                    {isDailyBooking ? 'اليومية' : (isAnnualContract ? 'السنوية' : 'الشهرية')}:{' '}
                    {isDailyBooking && dailyPrice != null ? (
                      <span className="font-extrabold font-mono" dir="ltr">{Number(dailyPrice).toLocaleString('en-US')}</span>
                    ) : isAnnualContract && yearlyRent != null ? (
                      <span className="font-extrabold font-mono" dir="ltr">{yearlyRent.toLocaleString('en-US')}</span>
                    ) : monthlyRent != null ? (
                      <span className="font-extrabold font-mono" dir="ltr">{monthlyRent.toLocaleString('en-US')}</span>
                    ) : (
                      '____'
                    )}{' '}ريال{!isDailyBooking && !isAnnualContract ? ' (للشهر الواحد)' : ''}
                    {isDailyBooking ? '' : ' (شامل الخدمات)'}
                    {totalRent != null ? <> {' '}— إجمالي الأجرة: <span className="font-extrabold font-mono" dir="ltr">{totalRent.toLocaleString('en-US')}</span> ريال</> : null}
                    {!isDailyBooking ? (
                      <>
                        {' '}— التأمين:{' '}
                        <span className="font-extrabold font-mono" dir="ltr">{depositFixed.toLocaleString('en-US')}</span>{' '}ريال
                      </>
                    ) : null}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-300 rounded-lg p-3 space-y-2 text-[11px]">
              <h3 className="font-bold text-[12px]">الصيانة</h3>
              <ul className="list-disc pr-4 space-y-1">
                <li>سوء الاستخدام على المستأجر</li>
                <li>الأعطال الفنية على المؤجر</li>
              </ul>
            </div>
            <div className="border border-gray-300 rounded-lg p-3 space-y-2 text-[11px]">
              <h3 className="font-bold text-[12px]">الإنهاء</h3>
              <p className="text-[11px]">
                يحق للمؤجر فسخ العقد عند التأخر بالسداد أو الإزعاج أو إساءة الاستخدام.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-4 border border-gray-300 rounded-lg p-3">
          <h3 className="font-bold text-sm mb-2">التزامات المستأجر</h3>
          <ul className="list-disc pr-4 space-y-1 text-[11px] leading-relaxed">
            <li>مراعاة السلوك والآداب الإسلامية، وعدم السماح بغير المرافقين، والالتزام بالهدوء وعدم إزعاج الآخرين.</li>
            <li>مسؤول عن كامل محتويات الشقة، المحافظة عليها، وتعويض أي تلف، ولا يجوز تحويل العهدة إلى شخص آخر.</li>
            <li>إغلاق التكييف والإضاءة والأجهزة الكهربائية عند المغادرة، ويتحمل المسؤولية عن أي أخطار.</li>
            
          
            <li>يُدفع الإيجار مقدماً.</li>
            <li>عند التغيب بعد انتهاء العقد بثلاثة أيام، يحق للإدارة فتح الشقة والتصرف فيها ورفع الممتلكات إلى المستودع دون مسؤولية، ويُعتبر العقد لاغياً.</li>
            <li>الإدارة غير مسؤولة عن فقدان الأشياء الثمينة الخاصة بالمستأجر داخل الشقة.</li>
            <li>لا يحق استرداد قيمة الإيجار عند المغادرة قبل انتهاء المدة المتفق عليها.</li>
            <li>عند رغبة التجديد أو الإخلاء، يجب إشعار الإدارة قبل انتهاء المدة بفترة مناسبة.</li>
            <li>الإخلال بأي شرط يُلغي العقد، ويحق للمؤجر فسخه دون إنذار مسبق.</li>
            <li>يمنع التأجير من الباطن.</li>
          </ul>
        </section>
        

        <section className="mt-6 text-xs">
          <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl bg-white">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">المستأجر</span>
                <span className="font-medium text-gray-800">{booking?.customer?.full_name || '—'}</span>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="w-64 h-10 border-b-2 border-gray-800"></div>
                <span className="text-gray-700">الاسم / التوقيع</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <img src={qrSrc} alt="QR" className="w-24 h-24 border border-gray-300 rounded-lg" />
              <span className="text-[10px] text-gray-600">رمز التحقق</span>
            </div>
          </div>
        </section>
       
      </div>

      <PrintActions />
    </div>
  );
}

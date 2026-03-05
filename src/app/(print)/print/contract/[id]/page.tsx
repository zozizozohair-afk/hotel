 

import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { format, differenceInYears, differenceInMonths, differenceInCalendarDays, addMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import Logo from '@/components/Logo';
import PrintActions from '../../PrintActions';
import RoleGate from '@/components/auth/RoleGate';

export const runtime = 'edge';

// نسخة تصميم رسمي مضغوط لصفحة عقد — مناسبة للطباعة في صفحة A4 واحدة

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ durationNote?: string; rentNote?: string; agentName?: string; agentTitle?: string }> }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const { durationNote, rentNote } = sp as any;
  const agentName = (sp as any).agentName as string | undefined;
  const agentTitleParam = (sp as any).agentTitle as string | undefined;
  const agentTitle = agentTitleParam || 'وكيل';

  // Build safe hrefs for clearing params without client handlers
  const qsNoAgent = new URLSearchParams();
  if (durationNote) qsNoAgent.set('durationNote', durationNote as string);
  if (rentNote) qsNoAgent.set('rentNote', rentNote as string);
  const removeAgentHref = `?${qsNoAgent.toString()}`;

  const qsNoRent = new URLSearchParams();
  if (durationNote) qsNoRent.set('durationNote', durationNote as string);
  if (agentName) qsNoRent.set('agentName', agentName);
  if (agentTitleParam) qsNoRent.set('agentTitle', agentTitleParam);
  const removeRentHref = `?${qsNoRent.toString()}`;
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
  const docType = (() => {
    const d = booking?.customer?.details || '';
    const m = d.match(/نوع الوثيقة[:\-]?\s*([^\n]+)/);
    return m ? m[1].trim() : null;
  })();
  const companionsCount = (() => {
    const d = booking?.customer?.details || '';
    const m = d.match(/عدد المرافقين[:\-]?\s*(\d+)/);
    return m ? Number(m[1]) : null;
  })();
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

  // Booking Source
  let bookingSourceLabel: string = '_';
  try {
    const { data: sourceEvent } = await supabase
      .from('system_events')
      .select('payload')
      .eq('booking_id', id)
      .eq('event_type', 'booking_source')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const src = sourceEvent?.payload as any;
    if (src?.booking_source === 'reception') bookingSourceLabel = 'استقبال';
    else if (src?.booking_source === 'platform') bookingSourceLabel = `منصة حجز: ${src?.platform_name || '—'}`;
    else if (src?.booking_source === 'broker') bookingSourceLabel = `وسيط: ${src?.broker_name || '—'}${src?.broker_id ? ` (${src?.broker_id})` : ''}`;
  } catch {}

  return (
    <RoleGate allow={['admin','manager']}>
    <div
      dir="rtl"
      className="bg-gray-100 min-h-screen py-8 px-4 md:px-6 lg:px-8 print:bg-white print:py-0 print:m-0 print:min-h-0"
    >
      <style>{`@media print { @page { size: A4; margin: 8mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
      {/* Controls (Agent + Rent) */}
      <div className="fixed top-6 left-6 z-50 print:hidden space-y-3">
        <form method="get" className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow p-3 w-80">
          <div className="text-sm font-bold text-gray-900 mb-2">إضافة موقّع وكيل</div>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600">اسم الوكيل</label>
              <input name="agentName" defaultValue={agentName || ''} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="مثال: فلان بن فلان" />
            </div>
            <div>
              <label className="text-xs text-gray-600">الصفة</label>
              <input name="agentTitle" defaultValue={agentTitle || 'وكيل'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="وكيل / مفوّض" />
            </div>
            {/* Preserve existing params */}
            {durationNote ? <input type="hidden" name="durationNote" value={durationNote} /> : null}
            {rentNote ? <input type="hidden" name="rentNote" value={rentNote} /> : null}
            <div className="flex items-center justify-end gap-2 pt-1">
              <a href={removeAgentHref} className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50">إزالة الوكيل</a>
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                تطبيق
              </button>
            </div>
          </div>
        </form>
        <form method="get" className="bg-white/90 backdrop-blur rounded-xl border border-gray-200 shadow p-3 w-80">
          <div className="text-sm font-bold text-gray-900 mb-2">تعديل نص الأجرة</div>
          <div className="space-y-2">
            <textarea name="rentNote" defaultValue={rentNote || ''} rows={3} placeholder="اكتب نص الأجرة المخصص..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            {/* Preserve existing params */}
            {durationNote ? <input type="hidden" name="durationNote" value={durationNote} /> : null}
            {agentName ? <input type="hidden" name="agentName" value={agentName} /> : null}
            {agentTitle ? <input type="hidden" name="agentTitle" value={agentTitle} /> : null}
            <div className="flex items-center justify-end gap-2 pt-1">
              <a href={removeRentHref} className="text-xs px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50">مسح النص</a>
              <button type="submit" className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                تطبيق
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* A4 Container */}
      <div className="mx-auto bg-white box-border w-full max-w-[194mm] min-h-[281mm] shadow-lg print:shadow-none p-[8mm] print:p-[8mm] text-[12.5px] leading-relaxed text-gray-900 relative overflow-x-auto md:overflow-visible">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
          <span className="font-extrabold text-gray-900/6 print:text-gray-900/8 tracking-widest rotate-[45deg] text-[28mm] whitespace-nowrap leading-none">
            مساكن الصفا
          </span>
        </div>
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-2 mb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                <Logo className="w-8 h-8 object-contain" />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-extrabold">عقد إيجار شهري</h1>
                <div className="flex items-center gap-3 text-[11px] text-gray-600">
                  <span>وحدة سكنية مفروشة</span>
                 
                </div>
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold">
                <span className="inline-flex items-center gap-1">
                  <span>رقم العقد:</span>
                  <span className="font-mono">{booking?.id?.slice(0, 8)?.toUpperCase()}</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span>تاريخ التحرير:</span>
                  <span>{today}</span>
                </span>
                {invoiceNumber && (
                  <span className="inline-flex items-center gap-1">
                    <span>رقم الفاتورة:</span>
                    <span className="font-mono" dir="ltr">{invoiceNumber}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <span>المصدر:</span>
                  <span>{bookingSourceLabel}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Parties */}
        <section className="mb-1 grid grid-cols-2 gap-6 border border-gray-300 rounded-lg p-1">
          <div>
            <h2 className="font-bold mb-2 text-sm">الطرف الأول (المؤجر)</h2>
            <p>المالك: شركة مساكن الرفاهية</p>
            <p>الممثل: شركة شموخ الرفاهية للتطوير والاستثمار العقاري</p>
            <p className="text-xs text-gray-700">السجل التجاري: <span className="font-mono font-bold">7037421299</span></p>
            <p>رقم الجوال 0538159915</p>
          </div>
          <div>
            <h2 className="font-bold mb-2 text-sm">الطرف الثاني (المستأجر)</h2>
  
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
              <p className="text-gray-600 text-right text-[10px] font-bold">الاسم</p>
              <p className="text-center text-[10px] font-bold">{booking?.customer?.full_name || '—'}</p>
              <p className="text-gray-600 text-left text-[10px] font-bold">Name</p>

              <p className="text-gray-600 text-right text-[10px] font-bold">الهوية</p>
              <p className="text-center font-mono text-[10px] font-bold">{booking?.customer?.national_id || '—'}</p>
              <p className="text-gray-600 text-left text-[10px] font-bold">National ID</p>

              <p className="text-gray-600 text-right text-[10px] font-bold">الجنسية</p> 
              <p className="text-center text-[10px] font-bold">{booking?.customer?.nationality || '—'}</p>
              <p className="text-gray-600 text-left text-[10px] font-bold">Nationality</p>

              <p className="text-gray-600 text-right text-[10px] font-bold">الجوال</p>
              <p className="text-center font-mono text-[10px] font-bold" dir="ltr">{booking?.customer?.phone || '—'}</p>
              <p className="text-gray-600 text-left text-[10px] font-bold">Mobile</p>

              <p className="text-gray-600 text-right text-[10px] font-bold">نوع الوثيقة</p>
              <p className="text-center text-[10px] font-bold">{docType || '—'}</p>
              <p className="text-gray-600 text-left text-[10px] font-bold">Document Type</p>

              <p className="text-gray-600 text-right text-[10px] font-bold">عدد المرافقين</p>
              <p className="text-center text-[10px] font-bold">{companionsCount != null ? companionsCount : '—'}</p>
              <p className="text-gray-600 text-left text-[10px] font-bold">Companions</p> 
            </div>
          </div>
        </section>

        {/* Unit Info */}
        <section className="mb-1 border border-gray-300 rounded-lg p-3">
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
        <section className="grid grid-cols-1 gap-2 mb-1">
          <div className="border border-gray-300 rounded-lg p-2 space-y-1.5 text-[11px]">
            <div className="flex flex-wrap items-baseline gap-1.5">
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

            <div className="flex flex-wrap items-baseline gap-1.5 pt-1.5">
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

          <div className="grid grid-cols-2 gap-1">
            <div className="border border-gray-300 rounded-lg p-2 space-y-1.5 text-[10px]">
              <h3 className="font-bold text-[12px]">الصيانة</h3>
              <ul className="list-disc pr-4 space-y-1">
                <li>سوء الاستخدام على الطرف الثاني</li>
                <li>الأعطال الفنية على الطرف الأول</li>
              </ul>
            </div>
            <div className="border border-gray-300 rounded-lg p-2 space-y-1.5 text-[10px]">
              <h3 className="font-bold text-[12px]">الإنهاء</h3>
              <p className="text-[10px]">
                يحق للمؤجر فسخ العقد عند التأخر بالسداد أو الإزعاج أو إساءة الاستخدام.
              </p>
              <p className="text-[10px]">
               في العقود الشهرية، عند انتهاء مدة العقد ولم يتم إشعار الإدارة قبل 7 أيام بالتمديد، يحق للطرف الأول إنهاء العقد، ويلتزم الطرف الثاني
               بالإخلاء الفوري للوحدة في تاريخ نهاية العقد  حسب المدة المحددة .
              </p>
            </div>
          </div>
        </section>

        <section className="mt-2 border border-gray-300 rounded-lg p-3">
          <h3 className="font-bold text-sm mb-2">الشروط والأحكام - التزامات الطرف الثاني</h3>
          <ul className="list-disc pr-4 space-y-1 text-[10px] leading-relaxed">
            <li>مراعاة السلوك والآداب الإسلامية، وعدم السماح بغير المرافقين، والالتزام بالهدوء وعدم إزعاج الآخرين.</li>
            <li>الطرف الثاني مسؤول عن كامل محتويات الشقة، المحافظة عليها، وتعويض أي تلف، ولا يجوز تحويل العهدة إلى شخص آخر.</li>
            <li>إغلاق التكييف والإضاءة والأجهزة الكهربائية عند المغادرة، ويتحمل المسؤولية عن أي أخطار.</li>
            <li>يحق للطرف الأول (أو ممثله) دخول الشقة للصيانة أو المعاينة بعد إشعار الطرف الثاني، كما يحق له الإخلاء الفوري عند استخدام الوحدة بشكل غير نظامي.</li>
<li>يتحمل الطرف الثاني كامل المسؤولية عن الشقة ومحتوياتها، وأي أضرار ناتجة عن سوء الاستخدام أو الإهمال، ويلتزم بتسليمها بالحالة المستلمة عليها.</li>
<li>يلتزم الطرف الثاني بسداد الإيجار في موعده، ويحق للطرف الأول عند التأخر فرض غرامة أو فسخ العقد دون إشعار.</li>
<li>يجب الالتزام بعدد الأشخاص المحدد، ويُمنع التأجير من الباطن أو إقامة التجمعات دون موافقة الإدارة، ويعد الإخلال سبباً لفسخ العقد.</li>
<li>لا يتحمل الطرف الأول مسؤولية انقطاع الخدمات الخارجة عن إرادته، ويحق له التصرف بالممتلكات المتروكة بعد (15) يوماً دون مسؤولية.</li>
            <li>يُدفع الإيجار مقدماً.</li>
            <li>عند التغيب بعد انتهاء العقد بثلاثة أيام، يحق للطرف الأول فتح الشقة والتصرف فيها ورفع الممتلكات إلى المستودع دون مسؤولية، ويُعتبر العقد لاغياً.</li>
            <li>الطرف الأول غير مسؤول عن فقدان الأشياء الثمينة الخاصة بالطرف الثاني داخل الشقة.</li>
            <li>لا يحق استرداد قيمة الإيجار عند المغادرة قبل انتهاء المدة المتفق عليها.</li>
            <li>عند رغبة التجديد أو الإخلاء، يجب إشعار الطرف الأول قبل انتهاء المدة بفترة مناسبة لا تقل عن 7 أيام.</li>
            <li>الإخلال بأي شرط يُلغي العقد، ويحق للطرف الأول فسخه دون إنذار مسبق.</li>
            <li>يمنع التأجير من الباطن.</li>
          </ul>
        </section>
        

        <section className="mt-2 text-xs">
          <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl bg-white">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">الطرف الثاني</span>
                <span className="font-medium text-gray-800">
                  {booking?.customer?.full_name || '—'}
                  {agentName ? ` — الموقع نيابة عنه: ${agentName}${agentTitle ? ` (${agentTitle})` : ''}` : ''}
                </span>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="w-50 h-7 border-b-2 border-gray-800"></div>
                <span className="text-gray-700">الاسم / التوقيع</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1">
                <img src="/masaken.png" alt="Masaken" className="w-16 h-16 border border-gray-300 rounded-lg object-contain bg-white" />
                <img src={qrSrc} alt="QR" className="w-16 h-16 border border-gray-300 rounded-lg" />
                <img src="/shmoh.png" alt="Shmoh" className="w-16 h-16 border border-gray-300 rounded-lg object-contain bg-white" />
              </div>
              <span className="text-[7px] text-gray-600">رمز التحقق </span>
            </div>
          </div>
        </section>
        
       
      </div>

      <PrintActions />
    </div>
    </RoleGate>
  );
}

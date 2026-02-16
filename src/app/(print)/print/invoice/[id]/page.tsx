import React from 'react';
import { createClient } from '@/lib/supabase-server';
import { format, differenceInMonths, differenceInCalendarDays } from 'date-fns';
import { notFound } from 'next/navigation';
import PrintActions from '../../PrintActions';
import Logo from '@/components/Logo';

export const runtime = 'edge';

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ mode?: string, print?: string }> }) {
  const { id } = await params;
  const qs = searchParams ? await searchParams : {};
  const mode = 'a4';
  const supabase = await createClient();

  let invoice: any = null;
  let booking: any = null;

  // 1. Try to fetch Invoice
  const { data: foundInvoice } = await supabase
    .from('invoices')
    .select(`
      *,
      booking:bookings(
        *,
        customer:customers(*),
        unit:units(
          *,
          unit_type:unit_types(
            *,
            hotel:hotels(*)
          )
        )
      )
    `)
    .eq('id', id)
    .single();

  if (foundInvoice) {
    invoice = foundInvoice;
    booking = foundInvoice.booking;
  } else {
    // 2. Fallback: Fetch Booking directly (Preview Mode)
    const { data: foundBooking } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        unit:units(
          *,
          unit_type:unit_types(
            *,
            hotel:hotels(*)
          )
        )
      `)
      .eq('id', id)
      .single();
    
    booking = foundBooking;
  }

  if (!booking) {
    return notFound();
  }

  // Determine displayed values
  const invoiceNumber = invoice?.invoice_number || `INV-${booking.id.slice(0, 8).toUpperCase()}`;
  const issueDateStr = invoice?.invoice_date || invoice?.created_at || booking.created_at;
  const issueDate = new Date(issueDateStr);

  // Fetch related invoices for the booking and payments for the main invoice
  const supInvoicesRes = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount')
    .eq('booking_id', booking.id)
    .order('created_at', { ascending: false });
  const bookingInvoices = supInvoicesRes.data || [];
  const mainInvoice =
    invoice ||
    bookingInvoices.find((inv: any) => !String(inv?.invoice_number || '').includes('-EXT-')) ||
    bookingInvoices[0] ||
    null;
  let payments: any[] = [];
  if (mainInvoice?.id) {
    const payRes = await supabase
      .from('payments')
      .select('id, payment_number, amount, payment_date, payment_method:payment_methods(name), invoice_id')
      .eq('invoice_id', mainInvoice.id)
      .order('payment_date', { ascending: true });
    payments = payRes.data || [];
  }
  // Also include booking-linked advance/receipt payments via journal entries referenced by booking or its invoices
  const referenceIds: string[] = [booking.id];
  if (bookingInvoices.length > 0) {
    bookingInvoices.forEach((inv: any) => referenceIds.push(inv.id));
    const invoiceIds = bookingInvoices.map((inv: any) => inv.id);
    const { data: invPays } = await supabase
      .from('payments')
      .select('id')
      .in('invoice_id', invoiceIds);
    (invPays || []).forEach((p: any) => referenceIds.push(p.id));
  }
  const { data: refTxns } = await supabase
    .from('journal_entries')
    .select('id, reference_id')
    .in('reference_id', referenceIds);
  const txnIds = (refTxns || []).map((t: any) => t.id);
  if (txnIds.length > 0) {
    const { data: txnLinkedPays } = await supabase
      .from('payments')
      .select('id, payment_number, amount, payment_date, payment_method:payment_methods(name), invoice_id, journal_entry_id')
      .in('journal_entry_id', txnIds)
      .order('payment_date', { ascending: true });
    if (txnLinkedPays && txnLinkedPays.length > 0) {
      const existingIds = new Set(payments.map(p => p.id));
      const extras = txnLinkedPays.filter(p => !existingIds.has(p.id));
      payments = [...payments, ...extras];
    }
  }

  const rawSubtotal = invoice?.subtotal ?? booking.subtotal ?? 0;
  const additionalServices = (booking.additional_services as any[]) || [];
  const additionalServicesTotal = additionalServices.reduce(
    (acc: number, s: any) => acc + (s?.amount || 0),
    0
  );
  const discountAmount = booking.discount_amount || 0;

  const roomBaseAmount = rawSubtotal - additionalServicesTotal + discountAmount;

  const subtotal = rawSubtotal;
  const hotelTaxRateRaw = Number(booking.unit?.unit_type?.hotel?.tax_rate ?? 0);
  const taxRate = isNaN(hotelTaxRateRaw) ? 0 : hotelTaxRateRaw;
  const taxAmount = invoice?.tax_amount ?? Math.round(subtotal * taxRate * 100) / 100;
  const total = (invoice?.total_amount ?? mainInvoice?.total_amount) ?? Math.round((subtotal + taxAmount) * 100) / 100;
  let paidAmount = payments.reduce((sum: number, p: any) => sum + Number(p?.amount || 0), 0);
  if (paidAmount === 0 && (invoice?.status === 'paid' || mainInvoice?.status === 'paid')) {
    paidAmount = Number(total) || 0;
  }
  const remaining = Math.max(0, Math.round((Number(total) - paidAmount) * 100) / 100);
  
  // Hotel Info (Supplier)
  const normalizeName = (s: string) => {
    if (!s) return s;
    let r = s;
    r = r.replace(/فندق\s*الصفا/gi, 'مساكن الصفا');
    r = r.replace(/مساكن\s*الصفا/gi, 'مساكن الصفا');
    return r;
  };
  const hotelRaw = booking.unit?.unit_type?.hotel || {
    name: 'مساكن الصفى',
    address: 'المملكة العربية السعودية',
    phone: '0538159915',
    cr_number: '7027279632'
  };
  const hotel = { ...hotelRaw, name: normalizeName(hotelRaw?.name) };
  const crNumber = hotel?.cr_number || '7027279632';

  const start = new Date(booking.check_in);
  const end = new Date(booking.check_out);
  const monthsTotal = Math.max(0, differenceInMonths(end, start));
  const daysTotal = Math.max(0, differenceInCalendarDays(end, start));
  const isExactYears = monthsTotal >= 12 && monthsTotal % 12 === 0;

  const dailyPrice =
    booking.unit?.unit_type?.daily_price != null
      ? Math.round(Number(booking.unit.unit_type.daily_price))
      : null;
  const monthlyPrice =
    booking.unit?.unit_type?.annual_price != null
      ? Math.round(Number(booking.unit.unit_type.annual_price) / 12)
      : booking.unit?.unit_type?.daily_price != null
      ? Math.round(Number(booking.unit.unit_type.daily_price) * 30)
      : null;
  const yearlyPrice =
    booking.unit?.unit_type?.annual_price != null
      ? Math.round(Number(booking.unit.unit_type.annual_price))
      : monthlyPrice != null
      ? monthlyPrice * 12
      : null;

  let qty = 0;
  let unitDisplayPrice: number | null = null;
  let unitLabel: 'day' | 'month' | 'year' = 'day';
  if (isExactYears) {
    unitLabel = 'year';
    qty = monthsTotal / 12;
    unitDisplayPrice = yearlyPrice;
  } else if (monthsTotal >= 1) {
    unitLabel = 'month';
    qty = monthsTotal;
    unitDisplayPrice = monthlyPrice;
  } else {
    unitLabel = 'day';
    qty = daysTotal;
    unitDisplayPrice = dailyPrice ?? monthlyPrice ?? yearlyPrice ?? null;
  }

  return (
    <div
      dir="rtl"
      className="bg-gray-100 min-h-screen py-8 print:bg-white print:py-0 print:m-0 print:min-h-0"
    >
      <style>{`@media print { @page { size: A4; margin: 8mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
      <div className="mx-auto bg-white box-border w-full max-w-[194mm] min-h-[281mm] shadow-lg print:shadow-none p-[8mm] print:p-[8mm] text-[12.5px] leading-relaxed text-gray-900 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
          <span className="font-extrabold text-gray-900/6 print:text-gray-900/8 tracking-widest rotate-[45deg] text-[28mm] whitespace-nowrap leading-none">
            مساكن الصفا
          </span>
        </div>
        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                <Logo className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">فاتورة</h1>
                <p className="text-xs text-gray-600">حجز إقامة</p>
              </div>
            </div>
            <div className="text-left space-y-1 text-xs font-semibold">
              <p>
                رقم الفاتورة:{' '}
                <span className="font-mono">{invoiceNumber}</span>
              </p>
              <p>تاريخ الإصدار: {format(issueDate, 'dd/MM/yyyy HH:mm')}</p>
              {booking?.id && (
                <p>
                  رقم الحجز:{' '}
                  <span className="font-mono">#{booking.id.slice(0, 8).toUpperCase()}</span>
                </p>
              )}
              <p>
                السجل التجاري:{' '}
                <span className="font-mono font-bold">{crNumber}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Meta boxes */}
        <section className="mb-4 grid grid-cols-2 gap-6 border-0">
          <div className="border border-gray-300 rounded-lg p-3 space-y-2">
            <h3 className="font-bold text-sm">بيانات الفاتورة</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <p className="text-gray-600">التوريد:</p>
              <p className="font-mono" dir="ltr">
                {format(new Date(booking.check_in), 'dd/MM/yyyy')} — {format(new Date(booking.check_out), 'dd/MM/yyyy')}
              </p>
              <p className="text-gray-600">الوحدة:</p>
              <p>رقم {booking.unit?.unit_number || '—'} — {booking.unit?.unit_type?.name || '—'}</p>
            </div>
          </div>
          <div className="border border-gray-300 rounded-lg p-3 space-y-2">
            <h3 className="font-bold text-sm">بيانات العميل</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <p className="text-gray-600">الاسم:</p>
              <p>{booking.customer?.full_name || '—'}</p>
              <p className="text-gray-600">الجوال:</p>
              <p dir="ltr" className="font-mono">{booking.customer?.phone || '—'}</p>
              {booking.customer?.national_id && (
                <>
                  <p className="text-gray-600">الهوية:</p>
                  <p className="font-mono">{booking.customer.national_id}</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="mb-4 border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 text-gray-800">
              <tr className="text-right">
                <th className="py-2 px-3 w-1/2 font-bold">الوصف</th>
                <th className="py-2 px-3 text-center font-bold">الكمية</th>
                <th className="py-2 px-3 text-center font-bold">سعر الوحدة</th>
                <th className="py-2 px-3 text-center font-bold">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="py-2 px-3 align-top">
                  <div className="font-bold text-gray-900">إقامة فندقية - {booking.unit?.unit_type?.name}</div>
                  <div className="text-[11px] text-gray-600 mt-1">
                    وحدة رقم {booking.unit?.unit_number} ({booking.booking_type === 'yearly' ? 'حجز سنوي' : 'حجز يومي'})
                  </div>
                  {discountAmount > 0 && (
                    <div className="text-[11px] text-red-600 mt-1">
                      يشمل خصم بقيمة <span className="font-mono">{discountAmount.toLocaleString()}</span> ر.س
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-mono">
                  {qty.toLocaleString()}
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {unitLabel === 'year' ? 'سنة' : unitLabel === 'month' ? 'شهر' : 'يوم'}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center font-mono">
                  {unitDisplayPrice != null
                    ? unitDisplayPrice.toLocaleString()
                    : (roomBaseAmount / (booking.nights || 1)).toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold">
                  {roomBaseAmount.toLocaleString()}
                </td>
              </tr>
              {additionalServices.map((service: any, index: number) => (
                <tr key={`service-${index}`}>
                  <td className="py-2 px-3 align-top">
                    <div className="font-medium text-gray-900">
                      {service.name || 'خدمة إضافية'}
                    </div>
                    {service.description && (
                      <div className="text-[11px] text-gray-600 mt-1">
                        {service.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {service.quantity || 1}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {(service.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    {(service.amount || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {discountAmount > 0 && (
                <tr>
                  <td className="py-2 px-3 align-top">
                    <div className="font-medium text-gray-900">خصم على الحجز</div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">1</td>
                  <td className="py-2.5 px-3 text-center font-mono">-{discountAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-red-600">-{discountAmount.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            {taxRate > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">الإجمالي (غير شامل الضريبة)</span>
                  <span className="font-mono font-bold">{subtotal.toLocaleString()} ر.س</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">ضريبة القيمة المضافة ({Math.round(taxRate * 100)}%)</span>
                  <span className="font-mono font-bold">{taxAmount.toLocaleString()} ر.س</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex items-center justify-between">
                  <span className="font-extrabold">الإجمالي المستحق</span>
                  <span className="font-mono font-extrabold text-lg">{total.toLocaleString()} ر.س</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">الإجمالي</span>
                  <span className="font-mono font-bold">{subtotal.toLocaleString()} ر.س</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex items-center justify-between">
                  <span className="font-extrabold">الإجمالي المستحق</span>
                  <span className="font-mono font-extrabold text-lg">{subtotal.toLocaleString()} ر.س</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Payments Log */}
        <section className="mt-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="font-bold text-sm mb-2">سجل المدفوعات</h3>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-gray-600">
                    <tr className="text-right">
                      <th className="py-1 px-2 font-bold">التاريخ</th>
                      <th className="py-1 px-2 font-bold text-center">الطريقة</th>
                      <th className="py-1 px-2 font-bold text-center">المبلغ</th>
                      <th className="py-1 px-2 font-bold text-center">رقم السند</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((p: any) => {
                      const voucher =
                        p?.payment_number || (p?.id ? String(p.id).slice(0, 8).toUpperCase() : '—');
                      return (
                        <tr key={p.id}>
                          <td className="py-1.5 px-2">
                            {p?.payment_date ? format(new Date(p.payment_date), 'dd/MM/yyyy') : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-center">{p?.payment_method?.name || '—'}</td>
                          <td className="py-1.5 px-2 text-center font-mono">{Number(p?.amount || 0).toLocaleString()} ر.س</td>
                          <td className="py-1.5 px-2 text-center font-mono">{voucher}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-2 text-xs text-gray-700 flex items-center justify-between">
                  <div>
                    <span>إجمالي المدفوعات: </span>
                    <span className="font-mono font-bold">{paidAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span>المتبقي: </span>
                    <span className="font-mono font-bold">{remaining.toLocaleString()} ر.س</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${remaining === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {remaining === 0 ? 'مدفوعة بالكامل' : 'غير مدفوعة بالكامل'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-700">
                <p className="text-gray-600">يوجد عربون</p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <span>إجمالي المدفوعات: </span>
                    <span className="font-mono font-bold">{paidAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span>المتبقي: </span>
                    <span className="font-mono font-bold">{remaining.toLocaleString()} ر.س</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${remaining === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {remaining === 0 ? 'مدفوعة بالكامل' : 'غير مدفوعة بالكامل'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
          <p className="font-medium text-gray-900">بيان رسمي</p>
          <p>تصدر هذه الفاتورة عن شركة شموخ الرفاهية الفندقية – مساكن الصفا وفق الأنظمة المرعية، وتُعتمد كمستند مالي رسمي لدى المنشأة.</p>
          <p>تلتزم المنشأة بمعايير ضيافة وجودة رفيعة، ويعد هذا المستند مرجعاً لمستحقات الإقامة والخدمات الإضافية إن وجدت.</p>
        </div>

        <div className="mt-6 flex justify-between items-start">
          <div className="text-xs text-gray-600">
            <p>المنشأة: {hotel.name}</p>
            {hotel.address && <p className="mt-0.5">{hotel.address}</p>}
            <p className="mt-0.5">
              السجل التجاري: <span className="font-mono font-bold">{crNumber}</span>
            </p>
          </div>
          <div className="text-xs text-gray-600">
            <div className="border p-1 rounded">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(JSON.stringify({
                  invoice: invoiceNumber,
                  national_id: booking.customer?.national_id || '-',
                  room: booking.unit?.unit_number || '-',
                  date: format(new Date(), 'dd/MM/yyyy HH:mm')
                }))}`}
                alt="Invoice QR"
                className="w-24 h-24"
              />
            </div>
            <div className="text-[10px] text-gray-600 text-center mt-1">بيانات الفاتورة</div>
          </div>
        </div>

        <PrintActions />
      </div>
    </div>
  );
}

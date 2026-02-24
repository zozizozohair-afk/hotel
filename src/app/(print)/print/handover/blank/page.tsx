import React from 'react';
import Logo from '@/components/Logo';
import PrintActions from '../../PrintActions';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const runtime = 'edge';

export default async function BlankHandoverPage() {
  const today = format(new Date(), 'dd/MM/yyyy', { locale: ar });

  return (
    <div dir="rtl" className="bg-gray-100 min-h-screen py-8 print:bg-white print:py-0 print:m-0 print:min-h-0">
      <style>{`@media print { @page { size: A4; margin: 8mm; } body { -webkit-print-color-adjust: exact; } }`}</style>
      <div className="mx-auto bg-white box-border w-full max-w-[194mm] min-h-[281mm] shadow-lg print:shadow-none p-[8mm] text-[12.5px] leading-relaxed text-gray-900 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
          <span className="font-extrabold text-gray-900/6 print:text-gray-900/8 tracking-widest rotate-[45deg] text-[28mm] whitespace-nowrap leading-none">
            مساكن الصفا
          </span>
        </div>

        <div className="border-b-2 border-gray-900 pb-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border border-gray-300 flex items-center justify-center overflow-hidden">
                <Logo className="w-12 h-12 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">محضر استلام وحدة</h1>
                <p className="text-xs text-gray-600">وحدة سكنية مفروشة</p>
              </div>
            </div>
            <div className="text-left space-y-1 text-xs font-semibold">
              <p>
                رقم الحجز:
                <span className="font-mono">—</span>
              </p>
              <p>تاريخ التحرير: {today}</p>
              <p>رقم الفاتورة: —</p>
            </div>
          </div>
        </div>

        <section className="mb-4 grid grid-cols-2 gap-6 border border-gray-300 rounded-lg p-3">
          <div>
            <h2 className="font-bold mb-2 text-sm">المؤجر</h2>
            <p>المالك: شركة مساكن الرفاهية</p>
            <p>الممثل: شركة شموخ الرفاهية للتطوير والاستثمار العقاري</p>
            <p className="text-xs text-gray-700">السجل التجاري: <span className="font-mono font-bold">7037421299</span></p>
          </div>
          <div>
            <h2 className="font-bold mb-2 text-sm">المستأجر</h2>
            <p>الاسم: —</p>
            <p>الهوية: —</p>
            <p>الجوال: —</p>
          </div>
        </section>

        <section className="mb-4 border border-gray-300 rounded-lg p-3">
          <h2 className="font-bold mb-2 text-sm">بيانات الوحدة</h2>
          <div className="grid grid-cols-3 gap-3">
            <p>رقم الوحدة: <span className="font-mono">—</span></p>
            <p>الدور: <span className="font-mono">—</span></p>
            <p>الاستخدام: سكني فقط</p>
          </div>
          <p className="mt-2 text-xs text-gray-600">النموذج: —</p>
        </section>

        <section className="mb-4 border border-gray-900 rounded-lg p-4">
          <h2 className="font-bold mb-3 text-sm">إقرار الاستلام</h2>
          <p className="text-[12px] leading-relaxed">
            يقر المستأجر بأنه قد استلم الوحدة السكنية المذكورة أعلاه بكامل خدماتها وتجهيزاتها وأثاثها وأجهزتها 
            بحالة سليمة وصالحة للاستخدام، وأنه اطّلع على مواصفاتها ومحتوياتها وتأكد من مطابقتها لما تم الاتفاق عليه. 
            كما يلتزم بالحفاظ على الوحدة ومرافقها وعدم إساءة استخدامها أو تعريضها لأي ضرر متعمد أو ناتج عن إهمال، 
            ويتحمل المسؤولية الكاملة عن أي أعطال أو أضرار تنشأ بسبب سوء الاستخدام أو مخالفة التعليمات، 
            ويلتزم بسداد قيمة الإصلاحات بموجب سندات رسمية أو فواتير صادرة من إدارة المبنى أو الجهة المختصة، 
            وذلك فور المطالبة ودون تأخير، ولا يحق له الامتناع أو التأخير عن السداد لأي سبب.
          </p>
        </section>

        <section className="mt-6 text-xs">
          <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl bg-white">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-900">المستأجر</span>
                <span className="font-medium text-gray-800">—</span>
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="w-64 h-10 border-b-2 border-gray-800"></div>
                <span className="text-gray-700">الاسم / التوقيع</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 text-center text-[11px] text-gray-700">
          هذه الوثيقة معمدة إلكترونياً ولا تحتاج إلى ختم
        </div>
      </div>

      <PrintActions />
    </div>
  );
}

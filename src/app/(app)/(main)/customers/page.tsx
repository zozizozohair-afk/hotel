'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Plus, 
  User, 
  Building2, 
  Globe, 
  Briefcase, 
  Filter,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit,
  MessageCircle,
  X,
  Calendar,
  CheckCircle,
  StickyNote
} from 'lucide-react';
import { CustomerModal, Customer as CustomerType, CustomerType as CustomerTypeEnum } from '@/components/customers/CustomerModal';

// Types (Reusing from Modal)
type Customer = CustomerType;

const CUSTOMER_TYPES: { id: CustomerTypeEnum | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'الكل', icon: User },
  { id: 'individual', label: 'أفراد', icon: User },
  { id: 'company', label: 'شركات', icon: Building2 },
  { id: 'platform', label: 'منصات', icon: Globe },
  { id: 'broker', label: 'وسطاء', icon: Briefcase },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<CustomerTypeEnum | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'crm' | 'segments'>('list');
  const [crmEvents, setCrmEvents] = useState<any[]>([]);
  const [crmType, setCrmType] = useState<string>('');
  const [crmCustomerId, setCrmCustomerId] = useState<string>('');
  const [crmText, setCrmText] = useState<string>('');
  const [crmEventType, setCrmEventType] = useState<'crm_note' | 'crm_call' | 'crm_whatsapp' | 'crm_email'>('crm_note');
  const [stages, setStages] = useState<Record<string, string>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | undefined>(undefined);
  const [activeCustomerIds, setActiveCustomerIds] = useState<string[]>([]);
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [selectedType, searchQuery]);

  useEffect(() => {
    fetchActiveCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === 'crm') {
      loadCrmEvents();
    }
    if (activeTab === 'segments') {
      loadStages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, customers]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedType !== 'all') {
        query = query.eq('customer_type', selectedType);
      }

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,national_id.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      // @ts-ignore
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('customer_id, status')
        .in('status', ['checked_in', 'confirmed']);

      if (error) throw error;

      const ids = Array.from(
        new Set(
          (data || [])
            .map((b: any) => b.customer_id)
            .filter((id: string | null) => !!id)
        )
      ) as string[];

      setActiveCustomerIds(ids);
    } catch (error) {
      console.error('Error fetching active customers:', error);
    }
  };

  const loadCrmEvents = async () => {
    let query = supabase
      .from('system_events')
      .select('id, created_at, event_type, message, payload, customer:customers(full_name)')
      .in('event_type', ['crm_note', 'crm_call', 'crm_whatsapp', 'crm_email'])
      .order('created_at', { ascending: false })
      .limit(200);
    if (crmType) query = query.eq('event_type', crmType);
    if (crmCustomerId) query = query.eq('customer_id', crmCustomerId);
    const { data } = await query;
    setCrmEvents(data || []);
  };

  const addCrmEvent = async () => {
    if (!crmCustomerId || !crmText.trim()) return;
    await supabase.from('system_events').insert({
      event_type: crmEventType,
      customer_id: crmCustomerId,
      message: crmText.trim(),
      payload: { channel: crmEventType.replace('crm_', '') }
    });
    setCrmText('');
    await loadCrmEvents();
  };

  const loadStages = async () => {
    const ids = customers.map((c) => c.id);
    if (ids.length === 0) {
      setStages({});
      return;
    }
    const { data } = await supabase
      .from('system_events')
      .select('id, customer_id, payload, created_at')
      .eq('event_type', 'crm_stage')
      .in('customer_id', ids)
      .order('created_at', { ascending: false });
    const map: Record<string, string> = {};
    (data || []).forEach((e: any) => {
      if (!map[e.customer_id] && e.payload?.stage) {
        map[e.customer_id] = e.payload.stage;
      }
    });
    setStages(map);
  };

  const setStage = async (customerId: string, stage: string) => {
    await supabase.from('system_events').insert({
      event_type: 'crm_stage',
      customer_id: customerId,
      message: `Stage set to ${stage}`,
      payload: { stage }
    });
    setStages((prev) => ({ ...prev, [customerId]: stage }));
  };

  const handleEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setCustomerToEdit(undefined);
    setIsModalOpen(true);
  };

  const handleOpenDetails = (customer: Customer) => {
    setSelectedCustomerDetails(customer);
    setIsDetailsOpen(true);
  };

  const getCustomerIcon = (type: CustomerTypeEnum) => {
    switch (type) {
      case 'company': return <Building2 className="text-purple-500" size={20} />;
      case 'platform': return <Globe className="text-blue-500" size={20} />;
      case 'broker': return <Briefcase className="text-orange-500" size={20} />;
      default: return <User className="text-gray-500" size={20} />;
    }
  };

  const getCustomerLabel = (type: CustomerTypeEnum) => {
    const found = CUSTOMER_TYPES.find(t => t.id === type);
    return found ? found.label : type;
  };

  const activeSet = new Set(activeCustomerIds);
  const filteredCustomers = customers.filter((customer) => {
    if (onlyActive && !activeSet.has(customer.id)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة العملاء والضيوف</h1>
          <p className="text-gray-500 mt-1">قائمة بجميع العملاء والشركات والمنصات المسجلة</p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          onClick={handleAdd}
        >
          <Plus size={20} />
          <span>عميل جديد</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-lg border text-sm ${activeTab === 'list' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200'}`}
        >
          العملاء
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2 rounded-lg border text-sm ${activeTab === 'crm' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200'}`}
        >
          تواصل
        </button>
        <button
          onClick={() => setActiveTab('segments')}
          className={`px-4 py-2 rounded-lg border text-sm ${activeTab === 'segments' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700 border-gray-200'}`}
        >
          نوع العميل
        </button>
      </div>

      {activeTab === 'list' && (
      <>
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="بحث بالاسم، رقم الجوال، أو الهوية..."
            className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {CUSTOMER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id as CustomerTypeEnum | 'all')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all
                ${selectedType === type.id 
                  ? 'bg-blue-50 text-blue-600 font-bold ring-1 ring-blue-200' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <type.icon size={16} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOnlyActive(false)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
            !onlyActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          كل العملاء
        </button>
        <button
          onClick={() => setOnlyActive(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 ${
            onlyActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          العملاء النشطين
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">لا يوجد عملاء</h3>
          <p className="text-gray-500 mt-2">لم يتم العثور على أي عملاء مطابقين للبحث</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative cursor-pointer"
              onClick={() => handleOpenDetails(customer)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    {getCustomerIcon(customer.customer_type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">{customer.full_name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 inline-block">
                        {getCustomerLabel(customer.customer_type)}
                      </span>
                      {activeSet.has(customer.id) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          نشط
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(customer);
                  }}
                  className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
              </div>

              <div className="space-y-2.5 text-sm text-gray-500">
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span dir="ltr">{customer.phone}</span>
                  </div>
                )}
                {customer.national_id && (
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-400" />
                    <span>{customer.national_id}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.nationality && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-gray-400" />
                    <span>{customer.nationality}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {customer.phone && (
                  <>
                    <a
                      href={`tel:${customer.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      <Phone size={14} />
                      اتصال
                    </a>
                    <a
                      href={`https://wa.me/${String(customer.phone).replace(/\\D/g, '').replace(/^0/, '966')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100"
                    >
                      <MessageCircle size={14} />
                      واتساب
                    </a>
                  </>
                )}
                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <Mail size={14} />
                    إيميل
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {activeTab === 'crm' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={crmEventType}
                onChange={(e) => setCrmEventType(e.target.value as any)}
              >
                <option value="crm_note">ملاحظة</option>
                <option value="crm_call">مكالمة</option>
                <option value="crm_whatsapp">واتساب</option>
                <option value="crm_email">بريد</option>
              </select>
              <select
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={crmCustomerId}
                onChange={(e) => setCrmCustomerId(e.target.value)}
              >
                <option value="">اختر العميل</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
              <input
                className="md:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="اكتب ملخص التفاعل..."
                value={crmText}
                onChange={(e) => setCrmText(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={crmType}
                  onChange={(e) => { setCrmType(e.target.value); loadCrmEvents(); }}
                >
                  <option value="">الكل</option>
                  <option value="crm_note">ملاحظة</option>
                  <option value="crm_call">مكالمة</option>
                  <option value="crm_whatsapp">واتساب</option>
                  <option value="crm_email">بريد</option>
                </select>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={crmCustomerId}
                  onChange={(e) => { setCrmCustomerId(e.target.value); }}
                >
                  <option value="">كل العملاء</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                <button
                  onClick={loadCrmEvents}
                  className="px-3 py-2 rounded-lg border text-sm bg-white hover:bg-gray-50"
                >
                  تحديث
                </button>
              </div>
              <button
                onClick={addCrmEvent}
                className="px-4 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
              >
                إضافة تواصل
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y">
            {crmEvents.length === 0 ? (
              <div className="p-6 text-gray-500 text-sm">لا توجد تفاعلات</div>
            ) : crmEvents.map((e) => (
              <div key={e.id} className="px-6 py-4 flex items-start gap-3 hover:bg-gray-50">
                <div className="mt-1 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  {e.event_type === 'crm_note' && <StickyNote size={16} className="text-gray-600" />}
                  {e.event_type === 'crm_call' && <Phone size={16} className="text-gray-600" />}
                  {e.event_type === 'crm_whatsapp' && <MessageCircle size={16} className="text-gray-600" />}
                  {e.event_type === 'crm_email' && <Mail size={16} className="text-gray-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {e.customer?.full_name || 'عميل'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(e.created_at).toLocaleString('ar-EG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">{e.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'segments' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 px-2 py-1">اختر مرحلة لكل عميل: محتمل، مهتم، عميل، عميل مميز</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">العميل</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">نوع الحساب</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">مرحلة CRM</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50">
                        <td className="px-4 py-2 text-gray-900">{c.full_name}</td>
                        <td className="px-4 py-2 text-gray-700">
                          {CUSTOMER_TYPES.find(t => t.id === c.customer_type)?.label || c.customer_type}
                        </td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                            {stages[c.id] === 'lead' ? 'محتمل' :
                             stages[c.id] === 'prospect' ? 'مهتم' :
                             stages[c.id] === 'vip' ? 'عميل مميز' :
                             stages[c.id] === 'customer' ? 'عميل' : 'غير محدد'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setStage(c.id, 'lead')} className="px-2 py-1 rounded-lg text-xs border bg-white hover:bg-gray-50">محتمل</button>
                            <button onClick={() => setStage(c.id, 'prospect')} className="px-2 py-1 rounded-lg text-xs border bg-white hover:bg-gray-50">مهتم</button>
                            <button onClick={() => setStage(c.id, 'customer')} className="px-2 py-1 rounded-lg text-xs border bg-white hover:bg-gray-50">عميل</button>
                            <button onClick={() => setStage(c.id, 'vip')} className="px-2 py-1 rounded-lg text-xs border bg-white hover:bg-gray-50">عميل مميز</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <CustomerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchCustomers();
        }}
        // @ts-ignore
        customerToEdit={customerToEdit}
      />
      {selectedCustomerDetails && (
        <CustomerDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          customer={selectedCustomerDetails}
        />
      )}
    </div>
  );
}

interface CustomerBooking {
  id: string;
  booking_number?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
  total_price?: number | null;
  unit_number?: string | null;
}

function CustomerDetailsModal({
  isOpen,
  onClose,
  customer
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}) {
  const [loading, setLoading] = useState(true);
  const [netBalance, setNetBalance] = useState<number | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [crmEvents, setCrmEvents] = useState<any[]>([]);
  const [noteText, setNoteText] = useState<string>('');
  const [callNote, setCallNote] = useState<string>('');
  const [whatsNote, setWhatsNote] = useState<string>('');
  const [emailNote, setEmailNote] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDue, setTaskDue] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadDetails() {
      setLoading(true);
      setError(null);

      try {
        const { data: statementData, error: statementError } = await supabase.rpc('get_customer_statement', {
          p_customer_id: customer.id
        });

        if (statementError) {
          console.error('Error fetching customer statement:', statementError);
        } else if (statementData && statementData.length > 0) {
          const lastRow = statementData[statementData.length - 1] as any;
          if (!cancelled) {
            setNetBalance(Number(lastRow.balance) || 0);
          }
        } else if (!cancelled) {
          setNetBalance(0);
        }

        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, check_in, check_out, status, total_price, units(unit_number)')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (bookingsError) {
          console.error('Error fetching customer bookings:', bookingsError);
        } else if (!cancelled) {
          const mapped = (bookingsData || []).map((b: any) => ({
            id: b.id,
            booking_number: b.booking_number,
            check_in: b.check_in,
            check_out: b.check_out,
            status: b.status,
            total_price: b.total_price ? Number(b.total_price) : null,
            unit_number: b.units?.unit_number || null
          }));
          setBookings(mapped);
        }

        const { data: eventsData } = await supabase
          .from('system_events')
          .select('id, created_at, event_type, message, payload')
          .eq('customer_id', customer.id)
          .in('event_type', ['crm_note', 'crm_call', 'crm_whatsapp', 'crm_email', 'crm_task'])
          .order('created_at', { ascending: false });
        if (!cancelled) {
          setCrmEvents(eventsData || []);
        }
      } catch (err: any) {
        console.error('Error loading customer details:', err);
        if (!cancelled) {
          setError('حدث خطأ أثناء تحميل تفاصيل العميل');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [isOpen, customer.id]);

  if (!isOpen) return null;

  const formattedBalance =
    netBalance === null
      ? '...'
      : new Intl.NumberFormat('ar-SA', {
          style: 'currency',
          currency: 'SAR',
          maximumFractionDigits: 2
        }).format(netBalance);

  const refreshCrm = async () => {
    const { data: eventsData } = await supabase
      .from('system_events')
      .select('id, created_at, event_type, message, payload')
      .eq('customer_id', customer.id)
      .in('event_type', ['crm_note', 'crm_call', 'crm_whatsapp', 'crm_email', 'crm_task'])
      .order('created_at', { ascending: false });
    setCrmEvents(eventsData || []);
  };

  const addCrmEvent = async (event_type: string, message: string, payload: any = {}) => {
    await supabase.from('system_events').insert({
      event_type,
      customer_id: customer.id,
      message,
      payload
    });
    await refreshCrm();
  };

  const toggleTaskStatus = async (e: any) => {
    const current = e?.payload || {};
    const nextStatus = current.status === 'done' ? 'open' : 'done';
    const newPayload = { ...current, status: nextStatus };
    await supabase.from('system_events').update({ payload: newPayload }).eq('id', e.id);
    await refreshCrm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">تفاصيل العميل</h2>
            <p className="text-sm text-gray-500 mt-1">{customer.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">نوع العميل: </span>
                <span>{CUSTOMER_TYPES.find(t => t.id === customer.customer_type)?.label}</span>
              </div>
              {customer.phone && (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" />
                  <span dir="ltr">{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">صافي حساب العميل</p>
                <p className="text-lg font-bold text-gray-900">{formattedBalance}</p>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                المبلغ يمثل صافي رصيد العميل حسب القيود المحاسبية.
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">ملاحظات داخلية عن العميل</p>
            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-700 min-h-[60px]">
              {customer.details && customer.details.trim().length > 0
                ? customer.details
                : 'لا توجد ملاحظات مسجلة لهذا العميل.'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">سجل الحجوزات</h3>
              <span className="text-xs text-gray-500">
                {bookings.length} حجز
              </span>
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 text-center">
                لا توجد حجوزات مسجلة لهذا العميل.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">رقم الحجز</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الوحدة</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الدخول</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الخروج</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الحالة</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} className="border-b border-gray-50">
                          <td className="px-4 py-2 text-gray-800">
                            {b.booking_number || b.id.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {b.unit_number || '-'}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {b.check_in
                              ? new Date(b.check_in).toLocaleDateString('ar-EG')
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-gray-700">
                            {b.check_out
                              ? new Date(b.check_out).toLocaleDateString('ar-EG')
                              : '-'}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-800">
                            {b.total_price != null
                              ? new Intl.NumberFormat('ar-SA', {
                                  style: 'currency',
                                  currency: 'SAR',
                                  maximumFractionDigits: 0
                                }).format(b.total_price)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">CRM</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote size={16} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">إضافة ملاحظة</span>
                  </div>
                  <textarea className="w-full p-2 border rounded-lg text-sm" rows={3} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={async () => {
                        if (!noteText.trim()) return;
                        await addCrmEvent('crm_note', noteText.trim(), {});
                        setNoteText('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone size={16} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">تسجيل مكالمة</span>
                  </div>
                  <input className="w-full p-2 border rounded-lg text-sm" value={callNote} onChange={(e) => setCallNote(e.target.value)} placeholder="ملخص المكالمة" />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={async () => {
                        if (!callNote.trim()) return;
                        await addCrmEvent('crm_call', callNote.trim(), { channel: 'call' });
                        setCallNote('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={16} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">تسجيل واتساب</span>
                  </div>
                  <input className="w-full p-2 border rounded-lg text-sm" value={whatsNote} onChange={(e) => setWhatsNote(e.target.value)} placeholder="ملخص المحادثة" />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={async () => {
                        if (!whatsNote.trim()) return;
                        await addCrmEvent('crm_whatsapp', whatsNote.trim(), { channel: 'whatsapp' });
                        setWhatsNote('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={16} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">تسجيل بريد إلكتروني</span>
                  </div>
                  <input className="w-full p-2 border rounded-lg text-sm" value={emailNote} onChange={(e) => setEmailNote(e.target.value)} placeholder="ملخص الرسالة" />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={async () => {
                        if (!emailNote.trim()) return;
                        await addCrmEvent('crm_email', emailNote.trim(), { channel: 'email' });
                        setEmailNote('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-500" />
                    <span className="text-sm font-semibold text-gray-800">إضافة مهمة</span>
                  </div>
                  <input className="w-full p-2 border rounded-lg text-sm mb-2" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="عنوان المهمة" />
                  <input className="w-full p-2 border rounded-lg text-sm" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={async () => {
                        if (!taskTitle.trim() || !taskDue) return;
                        await addCrmEvent('crm_task', `مهمة: ${taskTitle.trim()}`, { title: taskTitle.trim(), due_date: taskDue, status: 'open' });
                        setTaskTitle('');
                        setTaskDue('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
                <div className="p-4 border rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-800">المهام</span>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {crmEvents.filter(e => e.event_type === 'crm_task').map((e) => (
                      <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{e.payload?.title || e.message}</div>
                          <div className="text-xs text-gray-500">
                            {e.payload?.due_date ? new Date(e.payload.due_date).toLocaleDateString('ar-EG') : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleTaskStatus(e)}
                          className={`px-2 py-1 rounded-lg text-xs ${e.payload?.status === 'done' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {e.payload?.status === 'done' ? 'منجزة' : 'قيد التنفيذ'}
                        </button>
                      </div>
                    ))}
                    {crmEvents.filter(e => e.event_type === 'crm_task').length === 0 && (
                      <div className="text-sm text-gray-500">لا توجد مهام</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-800">الخط الزمني</span>
              </div>
              {loading ? (
                <div className="py-6 text-sm text-gray-500">جارٍ التحميل...</div>
              ) : crmEvents.length === 0 ? (
                <div className="py-6 text-sm text-gray-500">لا توجد أحداث</div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {crmEvents.map((e) => (
                    <div key={e.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="mt-1 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {e.event_type === 'crm_note' && <StickyNote size={14} className="text-gray-600" />}
                        {e.event_type === 'crm_call' && <Phone size={14} className="text-gray-600" />}
                        {e.event_type === 'crm_whatsapp' && <MessageCircle size={14} className="text-gray-600" />}
                        {e.event_type === 'crm_email' && <Mail size={14} className="text-gray-600" />}
                        {e.event_type === 'crm_task' && <Calendar size={14} className="text-gray-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {e.event_type === 'crm_note' ? 'ملاحظة' :
                             e.event_type === 'crm_call' ? 'مكالمة' :
                             e.event_type === 'crm_whatsapp' ? 'واتساب' :
                             e.event_type === 'crm_email' ? 'بريد' : 'مهمة'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(e.created_at).toLocaleString('ar-EG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 mt-0.5">{e.message}</div>
                        {e.event_type === 'crm_task' && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {e.payload?.status === 'done' ? 'منجزة' : 'قيد التنفيذ'} • {e.payload?.due_date ? new Date(e.payload.due_date).toLocaleDateString('ar-EG') : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

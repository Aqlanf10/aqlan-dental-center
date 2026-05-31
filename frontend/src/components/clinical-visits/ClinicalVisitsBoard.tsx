'use client';

import { useState, useEffect, useCallback } from 'react';
import { TodayClinicalVisitsDto, ClinicalVisitDto, ClinicalVisitStatusEnum } from '@/types/api';
import { api } from '@/lib/api';
import ClinicalVisitCard from './ClinicalVisitCard';
import ClinicalVisitEditor from './ClinicalVisitEditor';
import ClinicalVisitStats from './ClinicalVisitStats';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'حدث خطأ غير متوقع';
}

type FilterTab = 'all' | 'open' | 'inProgress' | 'completed' | 'cancelled';

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'open', label: 'مفتوحة' },
  { key: 'inProgress', label: 'قيد المعالجة' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'cancelled', label: 'ملغية' },
];

export default function ClinicalVisitsBoard() {
  const [data, setData] = useState<TodayClinicalVisitsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedVisit, setSelectedVisit] = useState<ClinicalVisitDto | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<TodayClinicalVisitsDto>(`/clinical-visits/today?date=${selectedDate}`);
      setData(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredVisits = (data?.visits || []).filter(v => {
    switch (activeTab) {
      case 'open': return v.status === ClinicalVisitStatusEnum.Open;
      case 'inProgress': return v.status === ClinicalVisitStatusEnum.InProgress;
      case 'completed': return v.status === ClinicalVisitStatusEnum.Completed;
      case 'cancelled': return v.status === ClinicalVisitStatusEnum.Cancelled;
      default: return true;
    }
  });

  if (loading && !data) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" /></div>;
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-center text-red-600"><p>{error}</p><button onClick={fetchData} className="mt-2 text-sm underline">إعادة المحاولة</button></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">الزيارات السريرية</h1>
          <p className="text-sm text-gray-500">إدارة الزيارات السريرية والتشخيص والعلاج</p>
        </div>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange" />
      </div>

      {data && <ClinicalVisitStats data={data} />}

      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{tab.label}</button>
        ))}
      </div>

      {filteredVisits.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVisits.map(visit => (
            <ClinicalVisitCard key={visit.id} visit={visit} onSelect={setSelectedVisit} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">لا توجد زيارات سريرية لهذا اليوم</p>
        </div>
      )}

      {selectedVisit && (
        <ClinicalVisitEditor
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DentalChartDto,
  ToothConditionDto,
  ToothConditionTypeLabels,
  ToothConditionTypeEnum,
  UpdateToothConditionRequest,
} from '@/types/api';
import { api } from '@/lib/api';

// Color map for conditions
const conditionColors: Record<number, string> = {
  [ToothConditionTypeEnum.Healthy]: '#22c55e',
  [ToothConditionTypeEnum.Caries]: '#ef4444',
  [ToothConditionTypeEnum.Filled]: '#3b82f6',
  [ToothConditionTypeEnum.Crown]: '#eab308',
  [ToothConditionTypeEnum.Missing]: '#9ca3af',
  [ToothConditionTypeEnum.Implant]: '#8b5cf6',
  [ToothConditionTypeEnum.RootCanal]: '#f97316',
  [ToothConditionTypeEnum.Bridge]: '#06b6d4',
  [ToothConditionTypeEnum.Veneer]: '#ec4899',
  [ToothConditionTypeEnum.Other]: '#6b7280',
};

const conditionBgColors: Record<number, string> = {
  [ToothConditionTypeEnum.Healthy]: 'bg-green-100 border-green-300',
  [ToothConditionTypeEnum.Caries]: 'bg-red-100 border-red-300',
  [ToothConditionTypeEnum.Filled]: 'bg-blue-100 border-blue-300',
  [ToothConditionTypeEnum.Crown]: 'bg-yellow-100 border-yellow-300',
  [ToothConditionTypeEnum.Missing]: 'bg-gray-100 border-gray-300',
  [ToothConditionTypeEnum.Implant]: 'bg-purple-100 border-purple-300',
  [ToothConditionTypeEnum.RootCanal]: 'bg-orange-100 border-orange-300',
  [ToothConditionTypeEnum.Bridge]: 'bg-cyan-100 border-cyan-300',
  [ToothConditionTypeEnum.Veneer]: 'bg-pink-100 border-pink-300',
  [ToothConditionTypeEnum.Other]: 'bg-gray-100 border-gray-300',
};

interface DentalChartProps {
  patientId: string | null;
}

// FDI teeth layout
const upperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
const upperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
const lowerRightTeeth = [48, 47, 46, 45, 44, 43, 42, 41];
const lowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];

// Surface options
const surfaces = ['M', 'O', 'D', 'B', 'L', 'P'] as const;
const surfaceLabels: Record<string, string> = {
  'M': 'إنسي (M)',
  'O': 'إطباقي (O)',
  'D': 'وحشي (D)',
  'B': 'شفة (B)',
  'L': 'لسان (L)',
  'P': 'حنك (P)',
};

function getToothShape(toothNumber: number): 'incisor' | 'canine' | 'premolar' | 'molar' {
  const lastDigit = toothNumber % 10;
  if (lastDigit === 1 || lastDigit === 2) return 'incisor';
  if (lastDigit === 3) return 'canine';
  if (lastDigit === 4 || lastDigit === 5) return 'premolar';
  return 'molar';
}

export default function DentalChart({ patientId }: DentalChartProps) {
  const [chart, setChart] = useState<DentalChartDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal form state
  const [formCondition, setFormCondition] = useState<number>(0);
  const [formSurfaces, setFormSurfaces] = useState<string[]>([]);
  const [formTreatmentDone, setFormTreatmentDone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchChart = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DentalChartDto>(`/general/dental-chart/${patientId}`);
      setChart(res.data);
    } catch {
      setError('فشل في تحميل الخريطة السنية');
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const getToothCondition = (toothNumber: number): ToothConditionDto | undefined => {
    return chart?.toothConditions?.find(tc => tc.toothNumber === toothNumber);
  };

  const getToothColor = (toothNumber: number): string => {
    const condition = getToothCondition(toothNumber);
    if (!condition) return '#22c55e'; // default healthy
    return conditionColors[condition.condition] || '#6b7280';
  };

  const getToothBorderClass = (toothNumber: number): string => {
    const condition = getToothCondition(toothNumber);
    if (!condition) return 'border-green-300 bg-green-50';
    return conditionBgColors[condition.condition] || 'border-gray-300 bg-gray-50';
  };

  const handleToothClick = (toothNumber: number) => {
    const condition = getToothCondition(toothNumber);
    setSelectedTooth(toothNumber);
    setFormCondition(condition?.condition ?? 0);
    setFormSurfaces(condition?.surfacesAffected ? condition.surfacesAffected.split(',') : []);
    setFormTreatmentDone(condition?.treatmentDone ?? '');
    setFormNotes(condition?.notes ?? '');
    setModalOpen(true);
  };

  const handleSaveTooth = async () => {
    if (!chart || selectedTooth === null) return;
    setSaving(true);
    try {
      const request: UpdateToothConditionRequest = {
        condition: formCondition,
        surfacesAffected: formSurfaces.length > 0 ? formSurfaces.join(',') : null,
        treatmentDone: formTreatmentDone || null,
        notes: formNotes || null,
      };
      await api.put(
        `/general/dental-chart/${chart.id}/tooth/${selectedTooth}`,
        request
      );
      await fetchChart();
      setModalOpen(false);
    } catch {
      setError('فشل في حفظ حالة السن');
    }
    setSaving(false);
  };

  const toggleSurface = (surface: string) => {
    setFormSurfaces(prev =>
      prev.includes(surface)
        ? prev.filter(s => s !== surface)
        : [...prev, surface]
    );
  };

  const ToothCell = ({ toothNumber }: { toothNumber: number }) => {
    const condition = getToothCondition(toothNumber);
    const shape = getToothShape(toothNumber);
    const fillColor = getToothColor(toothNumber);
    const borderClass = getToothBorderClass(toothNumber);

    // SVG dimensions based on tooth shape
    const width = shape === 'molar' ? 40 : shape === 'premolar' ? 34 : shape === 'canine' ? 30 : 28;
    const height = shape === 'molar' ? 38 : shape === 'premolar' ? 36 : shape === 'canine' ? 38 : 32;

    return (
      <button
        onClick={() => handleToothClick(toothNumber)}
        className={`flex flex-col items-center gap-0.5 rounded-lg border-2 p-1 transition-all hover:scale-105 hover:shadow-md ${borderClass}`}
        title={condition ? `${ToothConditionTypeLabels[condition.condition] || 'غير معروف'}${condition.surfacesAffected ? ` - ${condition.surfacesAffected}` : ''}` : 'سليم'}
      >
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-sm">
          {shape === 'incisor' && (
            <rect x="2" y="6" width={width - 4} height={height - 8} rx="6" ry="4" fill={fillColor} stroke="#374151" strokeWidth="1.5" />
          )}
          {shape === 'canine' && (
            <path d={`M4,${height - 6} L${width / 2},3 L${width - 4},${height - 6} Z`} fill={fillColor} stroke="#374151" strokeWidth="1.5" strokeLinejoin="round" />
          )}
          {shape === 'premolar' && (
            <rect x="3" y="5" width={width - 6} height={height - 10} rx="4" ry="3" fill={fillColor} stroke="#374151" strokeWidth="1.5" />
          )}
          {shape === 'molar' && (
            <rect x="2" y="4" width={width - 4} height={height - 8} rx="3" ry="2" fill={fillColor} stroke="#374151" strokeWidth="1.5" />
          )}
        </svg>
        <span className="text-[10px] font-bold text-gray-600">{toothNumber}</span>
      </button>
    );
  };

  if (!patientId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
        </svg>
        <p className="mt-4 text-lg font-bold text-gray-400">اختر مريضًا لعرض الخريطة السنية</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange border-t-transparent" />
      </div>
    );
  }

  if (error && !chart) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center text-red-600">
        <p>{error}</p>
        <button onClick={fetchChart} className="mt-2 text-sm underline">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        {Object.entries(ToothConditionTypeLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-gray-400"
              style={{ backgroundColor: conditionColors[Number(key)] }}
            />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Dental Chart SVG Layout */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="min-w-[600px] space-y-4">
          {/* Upper jaw */}
          <div>
            <div className="mb-1 text-center text-xs font-medium text-gray-500">الفك العلوي</div>
            <div className="flex items-center justify-center gap-1">
              <div className="text-xs font-medium text-gray-400 ml-2">أيمن</div>
              {upperRightTeeth.map(n => <ToothCell key={n} toothNumber={n} />)}
              <div className="mx-2 h-10 w-px bg-gray-300" />
              {upperLeftTeeth.map(n => <ToothCell key={n} toothNumber={n} />)}
              <div className="text-xs font-medium text-gray-400 mr-2">أيسر</div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-gray-300" />

          {/* Lower jaw */}
          <div>
            <div className="mb-1 text-center text-xs font-medium text-gray-500">الفك السفلي</div>
            <div className="flex items-center justify-center gap-1">
              <div className="text-xs font-medium text-gray-400 ml-2">أيمن</div>
              {lowerRightTeeth.map(n => <ToothCell key={n} toothNumber={n} />)}
              <div className="mx-2 h-10 w-px bg-gray-300" />
              {lowerLeftTeeth.map(n => <ToothCell key={n} toothNumber={n} />)}
              <div className="text-xs font-medium text-gray-400 mr-2">أيسر</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooth Edit Modal */}
      {modalOpen && selectedTooth !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">
                السن رقم {selectedTooth}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Condition */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الحالة</label>
                <select
                  value={formCondition}
                  onChange={(e) => setFormCondition(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                >
                  {Object.entries(ToothConditionTypeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Surfaces */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">الأسطح المتأثرة</label>
                <div className="grid grid-cols-3 gap-2">
                  {surfaces.map(s => (
                    <label key={s} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formSurfaces.includes(s)}
                        onChange={() => toggleSurface(s)}
                        className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-orange"
                      />
                      <span className="text-xs font-medium text-gray-700">{surfaceLabels[s]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Treatment Done */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">العلاج المُجرى</label>
                <input
                  type="text"
                  value={formTreatmentDone}
                  onChange={(e) => setFormTreatmentDone(e.target.value)}
                  placeholder="مثال: حشوة ضوئية..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">ملاحظات</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSaveTooth}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

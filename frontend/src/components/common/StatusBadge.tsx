'use client';

interface StatusBadgeProps {
  status: string;
  variant: 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'navy';
}

const variantStyles: Record<StatusBadgeProps['variant'], string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-red-50 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  navy: 'bg-navy/10 text-navy',
};

const dotStyles: Record<StatusBadgeProps['variant'], string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
  navy: 'bg-navy',
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${variantStyles[variant]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles[variant]}`} />
      {status}
    </span>
  );
}

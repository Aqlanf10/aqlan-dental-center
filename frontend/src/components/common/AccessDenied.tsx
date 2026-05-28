'use client';

import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  message?: string;
}

export default function AccessDenied({ message }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Lock icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-10 w-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-xl font-bold text-navy">
        {message || 'ليس لديك صلاحية للوصول إلى هذه الصفحة'}
      </h2>
      <button
        onClick={() => router.push('/dashboard')}
        className="mt-6 rounded-lg bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-light"
      >
        العودة إلى لوحة التحكم
      </button>
    </div>
  );
}

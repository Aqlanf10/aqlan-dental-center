'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizeMap = {
  sm: { img: 32, text: 'text-sm' },
  md: { img: 48, text: 'text-lg' },
  lg: { img: 64, text: 'text-2xl' },
};

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.svg"
        alt="شعار مركز عقلان"
        width={s.img}
        height={s.img}
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-bold text-navy leading-tight`}>
            مركز الدكتور عقلان الكامل
          </span>
          <span className="text-xs text-navy-light leading-tight">
            لتقويم وزراعة وتجميل الأسنان
          </span>
        </div>
      )}
    </div>
  );
}

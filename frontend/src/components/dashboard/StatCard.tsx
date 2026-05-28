interface StatCardProps {
  title: string;
  icon: React.ReactNode;
}

export default function StatCard({ title, icon }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-navy">--</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy/10 text-navy">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <span className="inline-block rounded-full bg-orange/15 px-2.5 py-0.5 text-[11px] font-medium text-orange">
          قريبًا
        </span>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="bg-navy-dark py-8 text-white">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-right">
            <p className="font-bold">مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان</p>
          </div>
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </footer>
  );
}

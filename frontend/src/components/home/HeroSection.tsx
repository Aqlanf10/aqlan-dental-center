export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-bl from-navy via-navy-dark to-navy py-20 lg:py-28">
      {/* Decorative circles */}
      <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-orange/10" />
      <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-blue/10" />

      <div className="relative mx-auto max-w-7xl px-4 text-center lg:px-8">
        <h1 className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
          مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
          نقدم لكم أعلى مستويات الرعاية الصحية للأسنان بأحدث التقنيات وأفضل الكوادر الطبية المتخصصة.
          صحة وجمال ابتسامتك هي أولويتنا.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="/booking"
            className="inline-flex items-center gap-2 rounded-xl bg-orange px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange/30 transition-all hover:bg-orange/90 hover:shadow-xl"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            احجز موعدك الآن
          </a>
          <button
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-3.5 text-base font-bold text-white transition-all hover:border-white/60 hover:bg-white/10"
            onClick={() => {
              const event = new CustomEvent('openLogin');
              window.dispatchEvent(event);
            }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            تسجيل الدخول
          </button>
        </div>
      </div>
    </section>
  );
}

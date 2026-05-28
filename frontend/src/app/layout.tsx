import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان",
  description: "مركز الدكتور عقلان الكامل لتقويم وزراعة وتجميل الأسنان - رعاية أسنان متميزة بأيدي متخصصين",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} font-tajawal antialiased`}>
        {children}
      </body>
    </html>
  );
}

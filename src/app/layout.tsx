import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "ניהול משימות - מחלקת חשמל גלעם",
  description: "מערכת לניהול קריאות ותקלות עבור מחלקת החשמל בגלעם",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <header className="bg-slate-900 text-white shadow">
          <div className="mx-auto max-w-5xl px-4 py-4 flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span className="font-bold text-lg">מחלקת חשמל - גלעם</span>
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-amber-300 transition-colors">
                לוח משימות
              </Link>
              <Link
                href="/tasks/new"
                className="hover:text-amber-300 transition-colors"
              >
                משימה חדשה
              </Link>
              <Link
                href="/electricians"
                className="hover:text-amber-300 transition-colors"
              >
                חשמלאים
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
          {children}
        </main>
        <footer className="text-center text-xs text-slate-400 py-4">
          מערכת ניהול משימות פנימית - מחלקת חשמל, גלעם
        </footer>
      </body>
    </html>
  );
}

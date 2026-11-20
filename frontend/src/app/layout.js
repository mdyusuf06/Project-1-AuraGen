import "./globals.css";

export const metadata = {
  title: "AuraGen | Self-Healing Generative UI Platform",
  description: "Adaptive, Friction-Responsive Enterprise Financial Platform"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-800 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

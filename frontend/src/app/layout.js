import "./globals.css";

export const metadata = {
  title: "AuraGen – Adaptive Financial Application",
  description: "Self-Healing Generative UI via Cognitive Load Telemetry"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}


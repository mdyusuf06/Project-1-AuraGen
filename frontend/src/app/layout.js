import "./globals.css";

export const metadata = {
  title: "AuraGen – Infotact Financial Portal",
  description: "Self-Healing Generative UI via Cognitive Load Telemetry (Week 1 Demo)"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}


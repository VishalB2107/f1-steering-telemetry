import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Steering Angle Telemetry | AI-Powered Reconstruction",
  description: "Commercial-grade Formula 1 telemetry reconstruction software. Predict and analyze driver steering wheel angles from onboard footage with neural-network accuracy.",
  icons: {
    icon: "https://img.icons8.com/external-soft-fill-juicy-fish/60/external-formula-vehicle-mechanics-soft-fill-soft-fill-juicy-fish.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="https://img.icons8.com/external-soft-fill-juicy-fish/60/external-formula-vehicle-mechanics-soft-fill-soft-fill-juicy-fish.png" />
      </head>
      <body className="antialiased bg-f1-black text-white min-h-screen carbon-grid">
        {children}
      </body>
    </html>
  );
}

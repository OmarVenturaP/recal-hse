import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://docs.obras-os.com"),
  title: "ObrasOS - DOCS | Sistema de Gestión Documental de SSPA",
  description: "Plataforma industrial premium para el control documental, gestión de fuerza de trabajo y cumplimiento normativo de seguridad en obra.",
  keywords: ["construcción", "HSE", "seguridad industrial", "gestión documental", "fuerza de trabajo", "Recal", "Cordina", "Informes de seguridad"],
  openGraph: {
    title: "ObrasOS - DOCS | Sistema de Gestión Documental de SSPA",
    description: "Digitalización estratégica y cumplimiento normativo para proyectos de infraestructura.",
    url: "https://docs.obras-os.com",
    siteName: "ObrasOS - DOCS",
    images: [
      {
        url: "https://res.cloudinary.com/ddl8myqbt/image/upload/q_auto/f_auto/v1775844681/logo-obras-os-docs_rkur0u.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
      </body>
    </html>
  );
}

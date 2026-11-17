import "@fontsource-variable/manrope";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
  title: "TaxEase AI",
  description: "Tax and GST help: deadlines, a regime calculator, document reading and an assistant.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

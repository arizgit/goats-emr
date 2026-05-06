import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "GoatsEMR",
  description: "Electronic medical records for goat cooperatives"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="mx-auto min-h-screen max-w-3xl pb-20">
            <Navbar />
            <main className="p-4">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

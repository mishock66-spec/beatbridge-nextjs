import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BeatBridge — Hip-Hop Networking",
  description:
    "BeatBridge maps the Instagram connections of established hip-hop artists and gives you personalized DM templates to reach the right people.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] text-white antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}

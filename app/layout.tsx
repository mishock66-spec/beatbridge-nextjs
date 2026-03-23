import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ScrollAnimations from "@/components/ScrollAnimations";
import { ClerkProvider } from "@clerk/nextjs";

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
    <ClerkProvider
      localization={{
        signIn: {
          start: {
            title: "Sign in to BeatBridge",
            subtitle: "Welcome back",
          },
        },
      }}
      appearance={{
        variables: {
          colorPrimary: "#f97316",
          colorBackground: "#111111",
          colorInputBackground: "#0a0a0a",
          colorText: "#ffffff",
          colorTextSecondary: "#9ca3af",
          colorInputText: "#ffffff",
          colorNeutral: "#374151",
        },
        elements: {
          card: "bg-[#111111] border border-[#1f1f1f] shadow-xl",
          headerTitle: "text-white font-black",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton:
            "bg-[#1f1f1f] border-[#2f2f2f] text-white hover:bg-[#2a2a2a]",
          formFieldInput:
            "bg-[#0a0a0a] border-[#1f1f1f] text-white focus:border-orange-500",
          footerActionLink: "text-orange-500 hover:text-orange-400",
        },
      }}
    >
      <html lang="en">
        <body className="bg-[#080808] text-white antialiased">
          <Navbar />
          <ScrollAnimations />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ScrollAnimations from "@/components/ScrollAnimations";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
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
        <head>
          {/* Favicon */}
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
          <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

          {/* PWA */}
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#f97316" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="BeatBridge" />

          {/* Primary SEO */}
          <meta name="title" content="BeatBridge — Hip-Hop Networking Tool for Beatmakers" />
          <meta name="description" content="BeatBridge maps the Instagram networks of established hip-hop artists like Curren$y and Harry Fraud. Get personalized DM templates to reach producers, sound engineers, managers and labels — not cold pitches." />
          <meta name="keywords" content="beatmaker networking, hip-hop networking tool, beat placement, DM templates for beatmakers, producer outreach, music industry contacts, networking for producers" />
          <meta name="author" content="BeatBridge" />
          <meta name="robots" content="index, follow" />

          {/* Open Graph */}
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://beatbridge.live" />
          <meta property="og:title" content="BeatBridge — Hip-Hop Networking for Beatmakers" />
          <meta property="og:description" content="Map the networks of established hip-hop artists. Get personalized DM templates to reach the right people — not just any people." />
          <meta property="og:image" content="https://beatbridge.live/og-image.png" />
          <meta property="og:site_name" content="BeatBridge" />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content="https://beatbridge.live" />
          <meta name="twitter:title" content="BeatBridge — Hip-Hop Networking for Beatmakers" />
          <meta name="twitter:description" content="Map the networks of established hip-hop artists. Get personalized DM templates to reach the right people — not just any people." />
          <meta name="twitter:image" content="https://beatbridge.live/og-image.png" />

          {/* JSON-LD structured data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                "name": "BeatBridge",
                "url": "https://beatbridge.live",
                "description": "Hip-hop networking tool that maps artist networks and provides personalized DM templates for beatmakers.",
                "applicationCategory": "MusicApplication",
                "operatingSystem": "Web",
                "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
                "audience": { "@type": "Audience", "audienceType": "Music producers and beatmakers" },
              }),
            }}
          />
        </head>
        <body className="bg-[#080808] text-white antialiased">
          <ServiceWorkerRegistration />
          <Navbar />
          <ScrollAnimations />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

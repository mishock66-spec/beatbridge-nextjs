export type ArtistRange = {
  slug: string;
  min: number;
  max: number;
  label: string;
  desc?: string;
  premium?: boolean;
};

export type ArtistConfig = {
  slug: string;
  name: string;
  subtitle: string;
  airtableFilter: string | string[];
  igHandle: string | null;
  photo: string;
  bio: string;
  description: string;
  genres: string[];
  socials: { instagram?: string; twitter?: string };
  email?: string;
  hasTop: boolean;
  ranges: ArtistRange[];
  defaultTemplate: string;
  followerCap: number;
};

const STANDARD_RANGES: ArtistRange[] = [
  { slug: "0-500",   min: 0,     max: 499,   label: "0 \u2013 500",   desc: "Best response rate" },
  { slug: "500-5k",  min: 500,   max: 4999,  label: "500 \u2013 5K",  desc: "High engagement" },
  { slug: "5k-10k",  min: 5000,  max: 9999,  label: "5K \u2013 10K",  desc: "Growing accounts" },
  { slug: "10k-20k", min: 10000, max: 19999, label: "10K \u2013 20K", desc: "Mid-tier reach" },
  { slug: "20k-30k", min: 20000, max: 29999, label: "20K \u2013 30K", desc: "Mid-tier reach" },
  { slug: "30k-40k", min: 30000, max: 39999, label: "30K \u2013 40K", desc: "Established" },
  { slug: "40k-50k", min: 40000, max: 50000, label: "40K \u2013 50K", desc: "Large following" },
];

const WHEEZY_RANGES: ArtistRange[] = [
  { slug: "500-5k",  min: 500,   max: 4999,  label: "500 \u2013 5K",  desc: "Best response rate" },
  { slug: "5k-10k",  min: 5000,  max: 9999,  label: "5K \u2013 10K",  desc: "High engagement" },
  { slug: "10k-15k", min: 10000, max: 14999, label: "10K \u2013 15K", desc: "Mid-tier reach" },
  { slug: "15k-20k", min: 15000, max: 19999, label: "15K \u2013 20K", desc: "Mid-tier reach" },
  { slug: "20k-25k", min: 20000, max: 24999, label: "20K \u2013 25K", desc: "Growing accounts" },
  { slug: "25k-30k", min: 25000, max: 29999, label: "25K \u2013 30K", desc: "Growing accounts" },
  { slug: "30k-35k", min: 30000, max: 34999, label: "30K \u2013 35K", desc: "Established" },
  { slug: "35k-40k", min: 35000, max: 39999, label: "35K \u2013 40K", desc: "Established" },
  { slug: "40k-50k", min: 40000, max: 50000, label: "40K \u2013 50K", desc: "Large following" },
];

const JUKE_WONG_RANGES: ArtistRange[] = [
  { slug: "0-500",   min: 0,     max: 499,   label: "0 \u2013 500",   desc: "Best response rate" },
  { slug: "500-5k",  min: 500,   max: 4999,  label: "500 \u2013 5K",  desc: "High engagement" },
  { slug: "5k-10k",  min: 5000,  max: 9999,  label: "5K \u2013 10K",  desc: "Growing accounts" },
  { slug: "10k-20k", min: 10000, max: 19999, label: "10K \u2013 20K", desc: "Mid-tier reach",  premium: true },
  { slug: "20k-30k", min: 20000, max: 29999, label: "20K \u2013 30K", desc: "Mid-tier reach",  premium: true },
  { slug: "30k-40k", min: 30000, max: 39999, label: "30K \u2013 40K", desc: "Established",     premium: true },
  { slug: "40k-50k", min: 40000, max: 50000, label: "40K \u2013 50K", desc: "Large following", premium: true },
];

const WONDAGURL_RANGES: ArtistRange[] = [
  { slug: "0-500",   min: 0,     max: 499,   label: "0 \u2013 500",   desc: "Best response rate" },
  { slug: "500-5k",  min: 500,   max: 4999,  label: "500 \u2013 5K",  desc: "High engagement" },
  { slug: "5k-10k",  min: 5000,  max: 9999,  label: "5K \u2013 10K",  desc: "Growing accounts" },
  { slug: "10k-15k", min: 10000, max: 14999, label: "10K \u2013 15K", desc: "Mid-tier reach" },
  { slug: "15k-20k", min: 15000, max: 19999, label: "15K \u2013 20K", desc: "Mid-tier reach" },
  { slug: "20k-25k", min: 20000, max: 24999, label: "20K \u2013 25K", desc: "Growing accounts" },
  { slug: "25k-30k", min: 25000, max: 29999, label: "25K \u2013 30K", desc: "Growing accounts" },
  { slug: "30k-35k", min: 30000, max: 34999, label: "30K \u2013 35K", desc: "Established" },
  { slug: "35k-40k", min: 35000, max: 39999, label: "35K \u2013 40K", desc: "Established" },
  { slug: "40k-50k", min: 40000, max: 50000, label: "40K \u2013 50K", desc: "Large following" },
];

export const ARTISTS_CONFIG: ArtistConfig[] = [
  {
    slug: "currensy",
    name: "Curren$y",
    subtitle: "Jet Life Recordings \u00b7 New Orleans, LA",
    airtableFilter: ["Curren$y", "CurrenSy"],
    igHandle: "spitta_andretti",
    photo: "/images/currensy.png",
    bio: "Prolific New Orleans rapper and founder of Jet Life Recordings. Spitta has cultivated one of the most loyal and talented networks in independent hip-hop \u2014 from beatmakers to A&R reps to engineers who all share his laid-back, smoke-filled aesthetic.",
    description: "New Orleans legend and founder of Jet Life. Known for his prolific output and tight-knit producer network.",
    genres: ["Hip-Hop", "New Orleans"],
    socials: {
      instagram: "https://www.instagram.com/spitta_andretti/",
      twitter: "https://x.com/CurrenSy_Spitta",
    },
    hasTop: true,
    ranges: [],
    defaultTemplate: "",
    followerCap: 50000,
  },
  {
    slug: "harry-fraud",
    name: "Harry Fraud",
    subtitle: "New York City \u00b7 Cinematic Boom-Bap",
    airtableFilter: "Harry Fraud",
    igHandle: "harryfraud",
    photo: "/images/harryfraud.jpg",
    bio: "New York\u2019s sonic architect \u2014 cinematic boom-bap, dark jazz, grimy street rap. The mind behind Smoke DZA, Rome Streetz, Crimeapple, Benny the Butcher.",
    description: "New York\u2019s sonic architect \u2014 cinematic boom-bap, dark jazz, grimy street rap. The mind behind Smoke DZA, Rome Streetz, Crimeapple, Benny the Butcher.",
    genres: ["Hip-Hop", "NYC"],
    socials: {
      instagram: "https://www.instagram.com/harryfraud/",
      twitter: "https://x.com/HarryFraud",
    },
    email: "HarryFraudBeats@gmail.com",
    hasTop: true,
    ranges: [],
    defaultTemplate: "",
    followerCap: 50000,
  },
  {
    slug: "wheezy",
    name: "Wheezy",
    subtitle: "Atlanta \u00b7 Trap \u00b7 Certified Trapper",
    airtableFilter: "Wheezy",
    igHandle: "wheezyouttahere",
    photo: "/images/wheezy.jpg",
    bio: "Atlanta\u2019s most in-demand producer. The architect behind Future, Gunna, Young Thug, and Lil Baby\u2019s biggest records. Co-founder of Certified Trapper, Wheezy\u2019s sound defines modern Atlanta trap.",
    description: "Atlanta\u2019s most in-demand producer. The architect behind Future, Gunna, Young Thug, and Lil Baby\u2019s biggest records. Co-founder of Certified Trapper.",
    genres: ["Hip-Hop", "Atlanta", "Trap"],
    socials: {
      instagram: "https://www.instagram.com/wheezy/",
      twitter: "https://x.com/wheezy0uttahere",
    },
    hasTop: true,
    ranges: WHEEZY_RANGES,
    defaultTemplate: "Yo, I noticed Wheezy follows you \u2014 that says a lot about who you are in the space. I\u2019m a beatmaker and I\u2019ve been working on some heat lately, think it could fit your lane?",
    followerCap: 50000,
  },
  {
    slug: "juke-wong",
    name: "Juke Wong",
    subtitle: "Melodic Trap \u00b7 Wheezy\u2019s Circle",
    airtableFilter: "Juke Wong",
    igHandle: "jukewong",
    photo: "/images/juke-wong.jpg",
    bio: "Producer known for his work with Wheezy and his signature melodic trap sound.",
    description: "Producer known for his work with Wheezy and his signature melodic trap sound.",
    genres: ["Hip-Hop", "Trap", "Melodic"],
    socials: {
      instagram: "https://www.instagram.com/jukewong/",
    },
    hasTop: true,
    ranges: JUKE_WONG_RANGES,
    defaultTemplate: "Yo, caught you in Juke Wong\u2019s circle \u2014 got some melodic trap beats I\u2019ve been sitting on, think it could fit your lane?",
    followerCap: 10000,
  },
  {
    slug: "southside",
    name: "Southside",
    subtitle: "Atlanta \u00b7 808 Mafia \u00b7 Trap",
    airtableFilter: "Southside",
    igHandle: "808mafiaboss",
    photo: "/images/southside.jpg",
    bio: "Co-founder of 808 Mafia. The architect behind Future, Drake, Travis Scott and Young Thug\u2019s biggest records.",
    description: "Co-founder of 808 Mafia. The architect behind Future, Drake, Travis Scott and Young Thug\u2019s biggest records.",
    genres: ["Hip-Hop", "Atlanta", "Trap"],
    socials: {
      instagram: "https://www.instagram.com/808mafiaboss/",
      twitter: "https://x.com/808mafiaboss",
    },
    hasTop: true,
    ranges: STANDARD_RANGES,
    defaultTemplate: "Yo, caught you in Southside\u2019s circle \u2014 got some hard trap beats I\u2019ve been sitting on, think it could fit your lane?",
    followerCap: 50000,
  },
  {
    slug: "metro-boomin",
    name: "Metro Boomin",
    subtitle: "Atlanta \u00b7 Boominati Worldwide \u00b7 Trap",
    airtableFilter: "Metro Boomin",
    igHandle: "metroboomin",
    photo: "/images/metro-boomin.jpg",
    bio: "Founder of Boominati Worldwide. The architect behind 21 Savage, Future, Drake, Travis Scott and Gunna\u2019s biggest records.",
    description: "Founder of Boominati Worldwide. The architect behind 21 Savage, Future, Drake, Travis Scott and Gunna\u2019s biggest records.",
    genres: ["Hip-Hop", "Atlanta", "Trap"],
    socials: {
      instagram: "https://www.instagram.com/metroboomin/",
      twitter: "https://x.com/MetroBoomin",
    },
    hasTop: true,
    ranges: STANDARD_RANGES,
    defaultTemplate: "Hey, caught you in Metro Boomin\u2019s circle \u2014 got some hard trap beats I\u2019ve been sitting on, think it could work?",
    followerCap: 50000,
  },
  {
    slug: "tay-keith",
    name: "Tay Keith",
    subtitle: "Memphis \u00b7 Trap",
    airtableFilter: "Tay Keith",
    igHandle: null,
    photo: "/images/tay-keith.jpg",
    bio: "Memphis producer behind some of the biggest trap records of the last decade. Known for his work with Drake, Travis Scott, Juice WRLD, and Lil Baby.",
    description: "Memphis producer behind some of the biggest trap records. Known for his work with Drake, Travis Scott, Juice WRLD, and Lil Baby.",
    genres: ["Hip-Hop", "Memphis", "Trap"],
    socials: { instagram: "https://www.instagram.com/taykeith/", twitter: "https://x.com/taykeith" },
    hasTop: false,
    ranges: STANDARD_RANGES,
    defaultTemplate: "Yo, caught you in Tay Keith\u2019s circle \u2014 got some hard trap beats I\u2019ve been sitting on, think it could fit your lane?",
    followerCap: 50000,
  },
  {
    slug: "wondagurl",
    name: "Wondagurl",
    subtitle: "Toronto \u00b7 Trap \u00b7 Producer",
    airtableFilter: "Wondagurl",
    igHandle: "wondagurl",
    photo: "/images/wondagurl.jpg",
    bio: "Toronto-based producer known for her work with Drake, Travis Scott, Jay-Z and Beyonc\u00e9. One of the most influential female producers in hip-hop.",
    description: "Toronto-based producer known for her work with Drake, Travis Scott, Jay-Z and Beyonc\u00e9.",
    genres: ["Hip-Hop", "Trap", "Toronto"],
    socials: { instagram: "https://www.instagram.com/wondagurl/", twitter: "https://x.com/WondaGurlBeats" },
    hasTop: false,
    ranges: WONDAGURL_RANGES,
    defaultTemplate: "Yo, saw you in Wondagurl\u2019s circle \u2014 got some hard beats I think could fit your lane, would love to connect.",
    followerCap: 50000,
  },
];

export function getArtist(slug: string): ArtistConfig | undefined {
  return ARTISTS_CONFIG.find((a) => a.slug === slug);
}

export function getAllSlugs(): string[] {
  return ARTISTS_CONFIG.map((a) => a.slug);
}

/** Get a range entry with prev/next slugs computed from position in the array. */
export function getArtistRange(
  artist: ArtistConfig,
  rangeSlug: string
): (ArtistRange & { prev?: string; next?: string }) | null {
  const idx = artist.ranges.findIndex((r) => r.slug === rangeSlug);
  if (idx === -1) return null;
  return {
    ...artist.ranges[idx],
    prev: artist.ranges[idx - 1]?.slug,
    next: artist.ranges[idx + 1]?.slug,
  };
}

/** Primary Airtable "Suivi par" value (first element if array). */
export function getArtistPrimaryFilter(artist: ArtistConfig): string {
  return Array.isArray(artist.airtableFilter)
    ? artist.airtableFilter[0]
    : artist.airtableFilter;
}

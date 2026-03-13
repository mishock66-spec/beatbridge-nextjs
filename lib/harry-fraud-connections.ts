import type { AirtableRecord } from "@/lib/airtable";

const raw: Omit<AirtableRecord, "id" | "profileUrl" | "instagramDmId">[] = [
  {
    username: "moelovesmangoes",
    fullName: "Moe",
    followers: 832,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey Moe, I came across your work through Harry Fraud's circle and wanted to reach out. The mixing on the records you've worked on is real — crisp and heavy. I'm an independent artist cooking up some dark, cinematic rap and I'm looking for the right engineer energy. Here's a link to what I'm building: [LINK]. Would love to connect.",
  },
  {
    username: "floodthevalley",
    fullName: "DJ BUFFALO",
    followers: 1624,
    profileType: "DJ",
    description: "",
    template:
      "Hey DJ BUFFALO, I came through Harry Fraud's network and had to reach out. I'm an independent artist with a dark, boom-bap sound — here's a link to what I've been working on: [LINK]. Would love to connect and see if we can build together.",
  },
  {
    username: "blackjoy.2000",
    fullName: "Jerome Caron",
    followers: 1809,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey Jerome, found your page through Harry Fraud's circle. I'm an independent artist putting together a project with a gritty NYC sound — looking for the right mixing ear. Here's where I'm at: [LINK]. Would love to connect.",
  },
  {
    username: "tevaar",
    fullName: "Tevaar Smith",
    followers: 2184,
    profileType: "Artist/Rapper",
    description: "",
    template:
      "Hey Tevaar, caught your page through Harry Fraud's network. Respect the craft. I'm an independent artist working on something cinematic and raw — here's a listen: [LINK]. Would love to connect and see about building together.",
  },
  {
    username: "rustymackonthedrums",
    fullName: "RustyMackOnTheDrums",
    followers: 2257,
    profileType: "Producer",
    description: "",
    template:
      "Hey Rusty, found your page through Harry Fraud's circle and the drums are crazy. That boom-bap energy is exactly what I'm looking for. I'm an independent rapper building my catalog — here's what I'm working on: [LINK]. Would love to build.",
  },
  {
    username: "hennytrack",
    fullName: "HENNY",
    followers: 2332,
    profileType: "Producer",
    description: "",
    template:
      "Hey HENNY, came across your production through Harry Fraud's network. That gritty, street sound is hard. I'm an independent artist working on a cinematic rap project — here's a link: [LINK]. Would love to connect.",
  },
  {
    username: "mixbyrich",
    fullName: "Richard Weber",
    followers: 2433,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey Richard, I came across your mixing work through Harry Fraud's circle. The clarity on those records is everything. I'm an independent artist recording a dark, NYC-influenced project and looking for the right engineer. Here's my current music: [LINK]. Would love to connect.",
  },
  {
    username: "hopewellmusicgroup",
    fullName: "Sean Munoz",
    followers: 2454,
    profileType: "Label",
    description: "",
    template:
      "Hey Sean, I came across Hopewell Music Group through Harry Fraud's network. I'm an independent artist with a serious body of work and looking to connect with forward-thinking labels. Here's a listen: [LINK]. Would love to see if there's a fit.",
  },
  {
    username: "djvip_harlem",
    fullName: "V.i.P. Beats",
    followers: 3013,
    profileType: "DJ",
    description: "",
    template:
      "Hey V.i.P., I'm reaching out through Harry Fraud's network. I'm an independent artist with a dark, cinematic sound — I think my records would hit in your sets. Here's a link: [LINK]. Would love to get on your radar.",
  },
  {
    username: "ezdoesitmgmt",
    fullName: "EzDoesIt Mgmt",
    followers: 3033,
    profileType: "Manager",
    description: "",
    template:
      "Hey, I came across EzDoesIt Mgmt through Harry Fraud's network. I'm an independent artist building serious momentum and looking for the right management energy. Here's a taste of what I've been working on: [LINK]. Would love to chop it up if you're open.",
  },
  {
    username: "rockstarmvp",
    fullName: "Steve Dickey",
    followers: 3196,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey Steve, I found your page through Harry Fraud's circle. The engineering on your projects sounds incredible — that warmth in the low end is real. I'm an independent artist working on a boom-bap project and looking for the right ear. Here's my current music: [LINK]. Would love to connect.",
  },
  {
    username: "nycreef",
    fullName: "Rob REEF Tewlow",
    followers: 5004,
    profileType: "Label",
    description: "",
    template:
      "Hey Rob, I came across your label through Harry Fraud's network. I'm an independent artist with a cinematic, NYC-influenced sound looking to connect with the right people. Here's a listen: [LINK]. Would love to see if there's potential to work together.",
  },
  {
    username: "the_infamous_oz",
    fullName: "Oz",
    followers: 6474,
    profileType: "Photographer/Videographer",
    description: "",
    template:
      "Hey Oz, I've seen your visual work through Harry Fraud's circle and the photography is on another level. I'm an independent artist looking for the right creative direction for my project. Here's my latest music: [LINK]. Would love to build something visual together.",
  },
  {
    username: "truthstudios",
    fullName: "Truth Studios",
    followers: 7485,
    profileType: "Studio",
    description: "",
    template:
      "Hey Truth Studios, I came across your studio through Harry Fraud's network. I'm an independent artist working on a dark, cinematic project and looking for the right room to record in. Here's some of my current work: [LINK]. Would love to discuss booking a session.",
  },
  {
    username: "mikeseaberg",
    fullName: "Mike Seaberg",
    followers: 8133,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey Mike, found your engineering work through Harry Fraud's circle. Your mixes are clean and powerful. I'm an independent artist working on a boom-bap, NYC-influenced album and looking for the right engineer. Here's where I'm at: [LINK]. Would love to connect.",
  },
  {
    username: "knice.on.the.sonics",
    fullName: "KNICE ON THE SONICS",
    followers: 8511,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey KNICE, I came across your work through Harry Fraud's network. That sonic clarity you bring is exactly what I need for my project. I'm an independent artist cooking up some dark, gritty rap — here's a listen: [LINK]. Would love to connect.",
  },
  {
    username: "turnmeupdavis",
    fullName: "Dāvis Strauss",
    followers: 8607,
    profileType: "Producer",
    description: "",
    template:
      "Hey Dāvis, found your production through Harry Fraud's circle. The atmosphere in your beats is hard. I'm an independent artist building a cinematic project and would love to connect. Here's where I'm at: [LINK]. Let's build.",
  },
  {
    username: "mike_kuz",
    fullName: "Mike Kuz",
    followers: 9283,
    profileType: "Producer",
    description: "",
    template:
      "Hey Mike, I came across your production through Harry Fraud's network. That gritty, dark style is exactly what I'm looking for. I'm an independent rapper working on my next project — here's my current music: [LINK]. Would love to see if we can build.",
  },
  {
    username: "1dgbdre",
    fullName: "1dgbdre",
    followers: 10064,
    profileType: "Label",
    description: "",
    template:
      "Hey, I came across your page through Harry Fraud's network. I'm an independent artist with a distinct sound looking to connect with forward-thinking people in the industry. Here's what I'm working on: [LINK]. Would love to see if there's a fit.",
  },
  {
    username: "iammattyrich",
    fullName: "Matty Rich",
    followers: 10289,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey Matty, I came across your engineering work through Harry Fraud's circle. The way you handle the low end is serious. I'm an independent artist working on a dark, cinematic rap project and looking for the right mixing ear. Here's my music: [LINK]. Would love to connect.",
  },
  {
    username: "gametime_doubledee",
    fullName: "Double Dee",
    followers: 11480,
    profileType: "Artist/Rapper",
    description: "",
    template:
      "Hey Double Dee, I came through Harry Fraud's network and wanted to reach out. Respect the grind. I'm an independent artist working on something raw and cinematic — here's a listen: [LINK]. Would love to connect and potentially build together.",
  },
  {
    username: "coachbombay3000",
    fullName: "COACH BOMBAY",
    followers: 12973,
    profileType: "Manager",
    description: "",
    template:
      "Hey COACH BOMBAY, I came across your management work through Harry Fraud's network. I'm an independent artist building serious momentum and looking for the right management team. Here's a taste of what I'm creating: [LINK]. Would love to connect if you're open.",
  },
  {
    username: "tyebeats_",
    fullName: "Yung $pend it",
    followers: 15275,
    profileType: "Producer",
    description: "",
    template:
      "Hey Yung $pend it, found your production through Harry Fraud's circle. That street energy in your beats is hard. I'm an independent artist working on a gritty, cinematic project — here's my music: [LINK]. Would love to build.",
  },
  {
    username: "prodbyneedlz",
    fullName: "Needlz",
    followers: 17476,
    profileType: "Producer",
    description: "",
    template:
      "Hey Needlz, I came across your production catalog through Harry Fraud's network. The range you bring is serious. I'm an independent artist building my project and would love to connect. Here's what I'm working on: [LINK]. Let's see if we can build together.",
  },
  {
    username: "poerilla",
    fullName: "PoeRilla NextLevel",
    followers: 22217,
    profileType: "Manager",
    description: "",
    template:
      "Hey PoeRilla, I came across your management work through Harry Fraud's network. I'm an independent artist with real momentum and a distinct sound looking for the right management energy. Here's a listen: [LINK]. Would love to chop it up if you're open.",
  },
  {
    username: "artbyfaneshafabre",
    fullName: "Fanesha Fabre",
    followers: 27249,
    profileType: "Other",
    description: "",
    template:
      "Hey Fanesha, I came across your work through Harry Fraud's network and had to reach out. I'm an independent artist building something with a dark, artistic aesthetic — I think there could be some interesting creative overlap. Here's what I'm working on: [LINK]. Would love to connect.",
  },
  {
    username: "iamheem",
    fullName: "Radio Raheem",
    followers: 27303,
    profileType: "Artist/Rapper",
    description: "",
    template:
      "Hey Radio Raheem, I came through Harry Fraud's network and wanted to reach out. Respect what you're doing in the music. I'm an independent artist working on something dark and cinematic — here's a listen: [LINK]. Would love to connect.",
  },
  {
    username: "beatbutcha_soi",
    fullName: "Beat Butcha",
    followers: 28557,
    profileType: "Producer",
    description: "",
    template:
      "Hey Beat Butcha, I've been following your production work for a minute — the grimy, dark sound is incredible. I'm an independent artist working in a similar sonic space and would love to connect. Here's what I'm building: [LINK]. Would love to work.",
  },
  {
    username: "evanlaray",
    fullName: "E L R",
    followers: 28944,
    profileType: "Producer",
    description: "",
    template:
      "Hey E L R, I came across your production through Harry Fraud's network. That atmospheric, dark sound you create is exactly what I'm looking for. I'm an independent rapper working on my next project — here's a taste: [LINK]. Would love to build.",
  },
  {
    username: "dannyg_beats",
    fullName: "Danny G",
    followers: 30296,
    profileType: "Producer",
    description: "",
    template:
      "Hey Danny G, found your production through Harry Fraud's circle. That dark, soulful energy hits different. I'm an independent artist building a cinematic project — here's where I'm at: [LINK]. Would love to connect.",
  },
  {
    username: "djbellek",
    fullName: "DjBellek",
    followers: 32766,
    profileType: "DJ",
    description: "",
    template:
      "Hey DjBellek, I came across your page through Harry Fraud's network. I'm an independent artist with a dark, boom-bap sound that I think would hit in your sets. Here's a link to what I've been working on: [LINK]. Would love to get on your radar.",
  },
  {
    username: "mrhudson",
    fullName: "Mr. Hudson",
    followers: 35503,
    profileType: "Producer",
    description: "",
    template:
      "Hey Mr. Hudson, I came across your work through Harry Fraud's network. The production quality and atmosphere in what you create is incredible. I'm an independent artist working on a cinematic project — here's a listen: [LINK]. Would love to connect.",
  },
  {
    username: "valperre",
    fullName: "VP Management",
    followers: 41778,
    profileType: "Manager",
    description: "",
    template:
      "Hey VP Management, I came across your work through Harry Fraud's network. I'm an independent artist with a distinct sound and real momentum, looking for the right management partnership. Here's a listen: [LINK]. Would love to connect if you're open.",
  },
  {
    username: "dannyboystylesxo",
    fullName: "DannyBoy Styles",
    followers: 41977,
    profileType: "Producer",
    description: "",
    template:
      "Hey DannyBoy, found your production through Harry Fraud's circle. That grimy, dark energy is exactly the sound I'm building around. I'm an independent artist working on a serious project — here's where I'm at: [LINK]. Would love to build.",
  },
  {
    username: "kyengineerin",
    fullName: "KY aka The Silver Fox",
    followers: 42903,
    profileType: "Sound Engineer",
    description: "",
    template:
      "Hey KY, I came across your engineering work through Harry Fraud's circle. That warm, powerful sound you bring to records is real. I'm an independent artist working on a cinematic boom-bap project and looking for the right engineer. Here's my music: [LINK]. Would love to connect.",
  },
  {
    username: "romestreetz",
    fullName: "Rome Streetz",
    followers: 43000,
    profileType: "Artist/Rapper",
    description: "",
    template:
      "Hey Rome, I've been following your work for a minute — the grittiness and authenticity in your music is real. I'm an independent artist working on something with a similar dark, cinematic energy. Here's a listen: [LINK]. Would love to connect.",
  },
  {
    username: "__crimeapple__",
    fullName: "CRIMEAPPLE",
    followers: 45855,
    profileType: "Artist/Rapper",
    description: "",
    template:
      "Hey CRIMEAPPLE, I've been a fan of your work for a minute. The density and craft in your bars is on another level. I'm an independent artist working in a similar sonic space — here's what I'm building: [LINK]. Would love to connect.",
  },
  {
    username: "dyryk",
    fullName: "Legend",
    followers: 45876,
    profileType: "Producer",
    description: "",
    template:
      "Hey Legend, I came across your production through Harry Fraud's network. That cinematic, layered sound is hard. I'm an independent rapper building my next project and looking for the right production energy — here's where I'm at: [LINK]. Let's build.",
  },
  {
    username: "blacksopranofamilyrecords",
    fullName: "BSF Records",
    followers: 49803,
    profileType: "Label",
    description: "",
    template:
      "Hey BSF Records, I came across your label through Harry Fraud's network. The roster you're building is impressive — Benny, Boldy, Rome. I'm an independent artist with a gritty, cinematic sound and a serious body of work. Here's a listen: [LINK]. Would love to see if there's potential to work together.",
  },
];

export const HARRY_FRAUD_CONNECTIONS: AirtableRecord[] = raw.map((r, i) => ({
  ...r,
  id: `hf-${i + 1}`,
  profileUrl: `https://www.instagram.com/${r.username}/`,
  instagramDmId: "",
}));

// Sorted by followers ascending — defines DM badge order (#1 = easiest to reach)
export const HARRY_FRAUD_DM_ORDER = [...HARRY_FRAUD_CONNECTIONS]
  .sort((a, b) => a.followers - b.followers)
  .map((r) => r.username);

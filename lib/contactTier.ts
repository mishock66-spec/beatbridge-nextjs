export function getContactTier(followers: number) {
  if (followers >= 50000) return { tier: "diamond", points: 100, emoji: "💎", label: "Diamond" };
  if (followers >= 20000) return { tier: "gold",    points: 50,  emoji: "🥇", label: "Gold"    };
  if (followers >= 5000)  return { tier: "silver",  points: 25,  emoji: "🥈", label: "Silver"  };
  return                         { tier: "bronze",  points: 10,  emoji: "🥉", label: "Bronze"  };
}

export function getUserRank(points: number) {
  if (points >= 5000) return { rank: "Legend",    emoji: "👑", next: null,        pointsToNext: 0 };
  if (points >= 1500) return { rank: "Industry",  emoji: "🎯", next: "Legend",    pointsToNext: 5000 - points };
  if (points >= 500)  return { rank: "Connector", emoji: "🔗", next: "Industry",  pointsToNext: 1500 - points };
  if (points >= 100)  return { rank: "Networker", emoji: "📡", next: "Connector", pointsToNext: 500 - points  };
  return                     { rank: "Rookie",    emoji: "🌱", next: "Networker", pointsToNext: 100 - points  };
}

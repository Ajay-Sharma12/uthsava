// Realistic-ish OTT dummy data for the Uthsava admin prototype.

export const KPI_TRENDS = Array.from({ length: 12 }).map((_, i) => ({
  m: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
  revenue: 120000 + Math.round(Math.sin(i / 1.5) * 30000) + i * 8500,
  users: 8000 + i * 1200 + Math.round(Math.cos(i) * 800),
  watch: 45000 + i * 3200,
}));

export const PLAN_DISTRIBUTION = [
  { name: "Basic", value: 4820, color: "var(--color-chart-3)" },
  { name: "Standard", value: 7320, color: "var(--color-chart-1)" },
  { name: "Premium", value: 3940, color: "var(--color-chart-2)" },
  { name: "Family", value: 2110, color: "var(--color-chart-4)" },
];

export const DEVICE_USAGE = [
  { device: "Android", sessions: 48210 },
  { device: "iOS", sessions: 31980 },
  { device: "Smart TV", sessions: 22140 },
  { device: "Web", sessions: 18760 },
  { device: "Tablet", sessions: 9420 },
];

export const TOP_CONTENT = [
  { title: "Mahabharat Reborn", views: 1_284_000, type: "Series", revenue: 482_000 },
  { title: "Mumbai Nights", views: 982_400, type: "Movie", revenue: 318_900 },
  { title: "Kingdom of Kashi", views: 874_200, type: "Series", revenue: 296_700 },
  { title: "Silent Monsoon", views: 642_100, type: "Movie", revenue: 201_300 },
  { title: "The Last Raga", views: 540_800, type: "Movie", revenue: 178_400 },
];

export const RECENT_ACTIVITY = [
  { who: "Aarav Mehta", what: "subscribed to Premium", when: "2m ago", type: "subscription" },
  { who: "Studio Lumière", what: "uploaded ‘Silent Monsoon’", when: "11m ago", type: "content" },
  { who: "Priya Sharma", what: "requested refund", when: "24m ago", type: "support" },
  {
    who: "RedKite Films",
    what: "submitted Episode 4 for approval",
    when: "38m ago",
    type: "approval",
  },
  { who: "Karan Patel", what: "payment failed (₹499)", when: "1h ago", type: "payment" },
  { who: "Niharika Roy", what: "registered new account", when: "1h ago", type: "user" },
];

export const USERS = Array.from({ length: 24 }).map((_, i) => {
  const names = [
    "Aarav Mehta",
    "Priya Sharma",
    "Karan Patel",
    "Niharika Roy",
    "Rohan Iyer",
    "Anaya Kapoor",
    "Vihaan Das",
    "Isha Verma",
    "Devansh Singh",
    "Meera Nair",
    "Aditya Rao",
    "Sara Khan",
  ];
  const countries = ["India", "UAE", "USA", "UK", "Singapore", "Canada", "Australia"];
  const plans = ["Basic", "Standard", "Premium", "Family"];
  const statuses = ["Active", "Inactive", "Suspended"] as const;
  return {
    id: `USR-${10234 + i}`,
    name: names[i % names.length],
    email: names[i % names.length].toLowerCase().replace(" ", ".") + `@uthsava.tv`,
    phone: `+91 ${90000 + i * 137}`.slice(0, 14),
    country: countries[i % countries.length],
    plan: plans[i % plans.length],
    subStatus: i % 5 === 0 ? "Expired" : "Active",
    joined: `2024-0${(i % 9) + 1}-${(i % 27) + 1}`,
    lastLogin: `${(i % 23) + 1}h ago`,
    watchHours: 40 + ((i * 17) % 320),
    devices: 1 + (i % 4),
    status: statuses[i % 3],
  };
});

export const PRODUCERS = Array.from({ length: 14 }).map((_, i) => {
  const cos = [
    "Studio Lumière",
    "RedKite Films",
    "Banyan Originals",
    "Kohinoor Pictures",
    "Indus Frames",
    "Cinema Verité",
    "Saffron House",
    "Northstar Studio",
  ];
  const status = ["Approved", "Pending", "Rejected", "Suspended"];
  return {
    id: `PRD-${4012 + i}`,
    company: cos[i % cos.length],
    contact: ["Rakesh Khanna", "Aisha Bose", "Vikram Sethi", "Lina D'Souza"][i % 4],
    email: `contact@${cos[i % cos.length].toLowerCase().replace(/\W+/g, "")}.com`,
    phone: `+91 99${(100000 + i * 41).toString().slice(0, 6)}`,
    uploads: 3 + ((i * 7) % 42),
    status: status[i % 4],
    revenue: 80000 + i * 24500,
    joined: `2023-${((i % 12) + 1).toString().padStart(2, "0")}-12`,
    verified: i % 3 !== 0,
  };
});

export const CONTENT = Array.from({ length: 18 }).map((_, i) => {
  const titles = [
    "Mahabharat Reborn",
    "Mumbai Nights",
    "Kingdom of Kashi",
    "Silent Monsoon",
    "The Last Raga",
    "Neon Bombay",
    "Sons of Deccan",
    "Aranyak Echoes",
    "Code of Honor",
    "Saffron Skies",
    "Veil of Varanasi",
    "Tides of Goa",
  ];
  const genres = ["Drama", "Thriller", "Romance", "Action", "Mythology", "Documentary"];
  const langs = ["Hindi", "English", "Tamil", "Telugu", "Bengali", "Marathi"];
  const types = ["Movie", "Series"];
  const status = ["Published", "Draft", "Pending", "Rejected"];
  return {
    id: `CNT-${7720 + i}`,
    title: titles[i % titles.length] + (i > 11 ? ` ${i}` : ""),
    type: types[i % 2],
    genre: genres[i % genres.length],
    lang: langs[i % langs.length],
    duration: i % 2 === 0 ? `${90 + i * 3}m` : `${i + 1} eps`,
    year: 2021 + (i % 5),
    producer: ["Studio Lumière", "RedKite Films", "Banyan Originals"][i % 3],
    uploaded: `2025-0${(i % 9) + 1}-${(i % 27) + 1}`,
    status: status[i % 4],
    approval: status[i % 4] === "Pending" ? "Awaiting" : "Approved",
    views: 12000 + i * 5400,
    revenue: 18000 + i * 4200,
    preview: `${2 + (i % 8)} min`,
    featured: i % 5 === 0,
  };
});

export const SERIES = CONTENT.filter((c) => c.type === "Series").map((s, i) => ({
  ...s,
  seasons: 1 + (i % 4),
  episodes: 6 + (i % 18),
}));

export const TRANSACTIONS = Array.from({ length: 20 }).map((_, i) => ({
  id: `TXN-${82910 + i}`,
  user: USERS[i % USERS.length].name,
  plan: ["Basic", "Standard", "Premium", "Family"][i % 4],
  method: ["UPI", "Card", "PayPal", "Apple Pay", "Google Pay"][i % 5],
  amount: [199, 499, 799, 1299][i % 4],
  tax: [36, 90, 144, 234][i % 4],
  fee: [10, 25, 40, 60][i % 4],
  share: [120, 320, 540, 880][i % 4],
  status: ["Success", "Pending", "Failed", "Refunded"][i % 4],
  date: `2025-1${(i % 2) + 0}-${(i % 27) + 1}`,
}));

export const PAYOUTS = Array.from({ length: 16 }).map((_, i) => {
  const p = PRODUCERS[i % PRODUCERS.length];
  const gross = 80000 + ((i * 53217) % 920000);
  const platformPct = [20, 25, 30][i % 3];
  const platform = Math.round((gross * platformPct) / 100);
  const tax = Math.round(gross * 0.1);
  const net = gross - platform - tax;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return {
    id: `PAY-${50120 + i}`,
    producer: p.company,
    producerId: p.id,
    period: `${months[i % 12]} 2025`,
    gross,
    platformPct,
    platform,
    tax,
    net,
    method: ["Bank Transfer", "UPI", "PayPal", "Wire"][i % 4],
    status: ["Pending", "Approved", "Paid", "On Hold"][i % 4],
    requestedOn: `2025-${((i % 12) + 1).toString().padStart(2, "0")}-05`,
    paidOn: i % 4 === 2 ? `2025-${((i % 12) + 1).toString().padStart(2, "0")}-12` : "—",
    invoice: `INV-${91200 + i}`,
  };
});

export const COUPONS = [
  {
    code: "WELCOME50",
    type: "Percentage",
    value: "50%",
    expiry: "2026-01-31",
    limit: 5000,
    used: 2840,
    status: "Active",
  },
  {
    code: "DIWALI299",
    type: "Flat",
    value: "₹299",
    expiry: "2025-11-15",
    limit: 10000,
    used: 7321,
    status: "Active",
  },
  {
    code: "STUDENT",
    type: "Percentage",
    value: "30%",
    expiry: "2026-06-30",
    limit: 2000,
    used: 612,
    status: "Active",
  },
  {
    code: "WIN2024",
    type: "Flat",
    value: "₹100",
    expiry: "2025-01-01",
    limit: 1000,
    used: 1000,
    status: "Expired",
  },
  {
    code: "LAUNCH10",
    type: "Percentage",
    value: "10%",
    expiry: "2026-12-31",
    limit: 50000,
    used: 14_211,
    status: "Active",
  },
];

export const NOTIFICATIONS = [
  {
    title: "New season of ‘Kingdom of Kashi’",
    audience: "All Users",
    channel: "Push + In-App",
    scheduled: "2025-11-12 19:00",
    status: "Scheduled",
  },
  {
    title: "Diwali offer ending soon",
    audience: "Inactive Users",
    channel: "Email",
    scheduled: "Sent · 2025-11-08",
    status: "Sent",
  },
  {
    title: "Producer payouts processed",
    audience: "Producers",
    channel: "Email",
    scheduled: "Sent · 2025-11-05",
    status: "Sent",
  },
];

export const DEVICES = Array.from({ length: 12 }).map((_, i) => ({
  id: `DVC-${5500 + i}`,
  user: USERS[i % USERS.length].name,
  type: ["Android", "iOS", "Smart TV", "Web", "Tablet"][i % 5],
  os: ["Android 14", "iOS 18.1", "Tizen 7", "Chrome 130", "iPadOS 18"][i % 5],
  login: `2025-11-0${(i % 9) + 1}`,
  lastActive: `${(i % 12) + 1}h ago`,
  status: i % 4 === 0 ? "Blocked" : "Active",
}));

export const TICKETS = Array.from({ length: 10 }).map((_, i) => ({
  id: `TKT-${3010 + i}`,
  user: USERS[i % USERS.length].name,
  issue: [
    "Playback error",
    "Refund request",
    "Login problem",
    "Subtitle missing",
    "Account suspended",
  ][i % 5],
  priority: ["Low", "Medium", "High", "Urgent"][i % 4],
  status: ["Open", "In Progress", "Resolved", "Closed"][i % 4],
  agent: ["Riya", "Arjun", "Sana", "Mohit"][i % 4],
  created: `2025-11-0${(i % 9) + 1}`,
}));

export const SUB_ADMINS = [
  {
    name: "Riya Bansal",
    email: "riya@uthsava.tv",
    role: "Content Manager",
    lastLogin: "2h ago",
    status: "Active",
  },
  {
    name: "Arjun Khanna",
    email: "arjun@uthsava.tv",
    role: "Support Lead",
    lastLogin: "1d ago",
    status: "Active",
  },
  {
    name: "Sana Khurana",
    email: "sana@uthsava.tv",
    role: "Finance",
    lastLogin: "5h ago",
    status: "Active",
  },
  {
    name: "Mohit Verma",
    email: "mohit@uthsava.tv",
    role: "Moderator",
    lastLogin: "3d ago",
    status: "Inactive",
  },
];

export const AUDIT_LOGS = Array.from({ length: 14 }).map((_, i) => ({
  action: [
    "Approved Content",
    "Suspended User",
    "Created Coupon",
    "Updated Plan",
    "Sent Notification",
    "Refunded Payment",
  ][i % 6],
  module: ["Content", "Users", "Coupons", "Plans", "Notifications", "Revenue"][i % 6],
  by: ["Admin", "Riya", "Arjun", "Sana"][i % 4],
  ts: `2025-11-${((i % 9) + 1).toString().padStart(2, "0")} 1${i % 9}:${(i * 7) % 60}`,
  ip: `103.21.${i + 10}.${(i * 13) % 255}`,
  device: ["Mac · Chrome", "Win · Edge", "iPhone · Safari"][i % 3],
  status: i % 5 === 0 ? "Failed" : "Success",
}));

export const PLANS = [
  {
    name: "Basic",
    monthly: 199,
    yearly: 1799,
    devices: 1,
    quality: "HD",
    download: 5,
    trial: "7 days",
    status: "Active",
  },
  {
    name: "Standard",
    monthly: 499,
    yearly: 4499,
    devices: 2,
    quality: "Full HD",
    download: 25,
    trial: "7 days",
    status: "Active",
  },
  {
    name: "Premium",
    monthly: 799,
    yearly: 7499,
    devices: 4,
    quality: "4K HDR",
    download: "Unlimited",
    trial: "14 days",
    status: "Active",
  },
  {
    name: "Family",
    monthly: 1299,
    yearly: 11999,
    devices: 6,
    quality: "4K HDR",
    download: "Unlimited",
    trial: "14 days",
    status: "Active",
  },
];

export const CATEGORIES = [
  { name: "Originals", icon: "Sparkles", count: 84, status: "Active", created: "2024-02-10" },
  { name: "Trending Now", icon: "Flame", count: 32, status: "Active", created: "2024-02-12" },
  { name: "New Releases", icon: "Star", count: 41, status: "Active", created: "2024-03-01" },
  { name: "Regional", icon: "Globe", count: 156, status: "Active", created: "2024-04-19" },
  { name: "Kids", icon: "Smile", count: 28, status: "Inactive", created: "2024-05-22" },
];

export const GENRES = [
  { name: "Drama", count: 142, status: "Active" },
  { name: "Thriller", count: 87, status: "Active" },
  { name: "Romance", count: 65, status: "Active" },
  { name: "Action", count: 99, status: "Active" },
  { name: "Mythology", count: 34, status: "Active" },
  { name: "Documentary", count: 41, status: "Active" },
];

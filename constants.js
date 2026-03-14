// ── CONFIGURABLE RATE CONSTANTS ──────────────────────────────────
const COST_RATES = {
  solar: {
    mono: 22, // ৳ per W — standard monocrystalline
    poly: 28, // ৳ per W — premium polycrystalline
  },
  battery: {
    "lead-acid": 10000, // ৳ per kWh
    lifepo4: 25000, // ৳ per kWh
  },
  inverter: {
    pwm: 10000, // ৳ per kW — standard off-grid inverter with PWM
    mppt: 13000, // ৳ per kW — inverter with MPPT controller
    hybrid: 20000, // ৳ per kW — hybrid inverter (grid + battery)
  },
  chargeController: {
    pwm: 45, // ৳ per amp — PWM controller (cheaper)
    mppt: 80, // ৳ per amp — MPPT controller (more efficient)
    hybrid: 0, // Built into hybrid inverter
  },
};

// Battery depth of discharge by type
const DOD_MAP = {
  "lead-acid": 0.5, // Max 50% DoD to protect battery life
  lifepo4: 0.85, // LiFePO4 can safely use 85% DoD
};

// Battery factor: how much battery storage each controller type needs
const SYSTEM_BATTERY_FACTOR = {
  pwm: 1.0, // Full autonomy, user-defined backup hours
  mppt: 1.0, // Full autonomy, more efficient charging
  hybrid: 1.0, // Full backup — hybrid manages grid + battery
};

// Solar sizing factor per controller type
const SYSTEM_SOLAR_FACTOR = {
  pwm: 1.0,
  mppt: 0.9, // MPPT is ~10-15% more efficient — smaller array needed
  hybrid: 1.0,
};

// MPPT efficiency bonus (MPPT extracts more from same panel area)
const MPPT_EFFICIENCY_BONUS = {
  pwm: 1.0,
  mppt: 1.15, // MPPT controllers are ~15% more efficient
  hybrid: 1.1, // Hybrid inverter with MPPT built-in
};

// Standard controller max amps per unit
const MAX_CC_AMPS = 60;

// Available panel wattages
const PANEL_SIZES = [250, 300, 400, 500, 600];

// Ah presets per bank voltage
const BATTERY_SIZES = {
  12: [20, 40, 50, 75, 100, 120, 150, 180, 200, 220, 250],
  24: [50, 100, 150, 200, 250, 300],
  48: [50, 100, 150, 200, 280, 300],
};
// ─────────────────────────────────────────────────────────────────

const ALL_APPLIANCES = [
  {
    id: "light",
    name: "LED Lights",
    name_bn: "এলইডি লাইট",
    icon: "fa-lightbulb",
    iconColor: "ic-yellow",
    watts: 20,
    defaultQty: 4,
    hours: 3,
    category: "common",
  },
  {
    id: "fan",
    name: "Ceiling Fan",
    name_bn: "সিলিং ফ্যান",
    icon: "fa-wind",
    iconColor: "ic-sky",
    watts: 75,
    defaultQty: 4,
    hours: 3,
    category: "common",
  },
  {
    // 150W avg draw reflects real compressor duty-cycle consumption
    id: "fridge",
    name: "Refrigerator",
    name_bn: "রেফ্রিজারেটর",
    icon: "fa-icicles",
    iconColor: "ic-teal",
    watts: 150,
    defaultQty: 1,
    hours: 3,
    category: "common",
  },
  {
    id: "router",
    name: "WiFi Router",
    name_bn: "ওয়াইফাই রাউটার",
    icon: "fa-wifi",
    iconColor: "ic-blue",
    watts: 15,
    defaultQty: 1,
    hours: 3,
    category: "common",
  },
  {
    id: "laptop",
    name: "Laptop / PC",
    name_bn: "ল্যাপটপ / পিসি",
    icon: "fa-laptop",
    iconColor: "ic-violet",
    watts: 100,
    defaultQty: 1,
    hours: 3,
    category: "common",
  },
  {
    id: "washing",
    name: "Washing Machine",
    name_bn: "ওয়াশিং মেশিন",
    icon: "fa-tint",
    iconColor: "ic-cyan",
    watts: 500,
    defaultQty: 0,
    hours: 3,
    category: "other",
    hasSurge: true,
  },
  {
    id: "oven",
    name: "Microwave Oven",
    name_bn: "মাইক্রোওয়েভ ওভেন",
    icon: "fa-utensils",
    iconColor: "ic-orange",
    watts: 1200,
    defaultQty: 0,
    hours: 0.3,
    category: "other",
  },
  {
    id: "induction",
    name: "Induction Cooker",
    name_bn: "ইন্ডাকশন কুকার",
    icon: "fa-fire-alt",
    iconColor: "ic-red",
    watts: 1500,
    defaultQty: 0,
    hours: 3,
    category: "other",
  },
  {
    id: "motor",
    name: "Water Pump",
    name_bn: "ওয়াটার পাম্প",
    icon: "fa-water",
    iconColor: "ic-green",
    watts: 1000,
    defaultQty: 0,
    hours: 3,
    category: "other",
    hasSurge: true,
  },
  {
    id: "ac",
    name: "Air Conditioner",
    name_bn: "এয়ার কন্ডিশনার",
    icon: "fa-snowflake",
    iconColor: "ic-pink",
    watts: 1800,
    defaultQty: 0,
    hours: 3,
    category: "other",
    hasSurge: true,
  },
];

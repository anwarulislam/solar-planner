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
    "off-grid": 12000, // ৳ per kW
    hybrid: 18000,
    "grid-tied": 22000,
  },
  chargeControllerPerAmp: 80, // ৳ per amp (MPPT)
};

// Battery depth of discharge by type
const DOD_MAP = {
  "lead-acid": 0.5, // Max 50% DoD to protect battery life
  lifepo4: 0.85, // LiFePO4 can safely use 85% DoD
};

// Battery factor: how much battery storage each system type needs
const SYSTEM_BATTERY_FACTOR = {
  "off-grid": 1.0, // Full autonomy — no grid fallback
  hybrid: 0.5, // Grid covers 50% of backup needs
  "grid-tied": 0.0, // No battery storage needed
};

// Solar sizing factor per system type
const SYSTEM_SOLAR_FACTOR = {
  "off-grid": 1.0,
  hybrid: 0.9, // Grid supplements, slightly smaller array
  "grid-tied": 1.05, // Slight oversize for grid export
};

// Standard MPPT controller max amps per unit
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

// ── TRANSLATIONS ─────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    badge: "Solar Power Planner",
    title: "Solar Setup Calculator",
    appliancesTitle: "Daily Appliances & Load",
    appliancesDesc: "Set quantity and daily usage hours for each device",
    otherAppliances: "Other Appliances",
    showOther: "Show Other Appliances",
    hideOther: "Hide Other Appliances",
    qty: "Qty",
    hoursPerDay: "Hours / Day",
    wPerUnit: "W per unit",
    totalWatts: "W total",
    prefsTitle: "System Preferences",
    prefsDesc: "Fine-tune battery, solar, and inverter parameters",
    backupDuration: "Backup Duration",
    backupHint: "Battery-only runtime with no solar production (night/cloudy)",
    peakSunHours: "Peak Sun Hours",
    peakSunHint: "Location-specific solar intensity (daily average)",
    sysEfficiency: "System Efficiency",
    sysEfficiencyHint: "Accounts for wiring, dust, heat losses",
    panelWatts: "Panel Size",
    panelWattsHint: "Rated wattage per individual panel",
    panelType: "Panel Type",
    panelHint: "Affects panel cost per watt",
    panelStandard: "Standard",
    panelMono: "(Monocrystalline)",
    panelPremium: "Premium",
    panelPoly: "(Polycrystalline)",
    batteryType: "Battery Type",
    batteryHint: "Affects battery cost per kWh",
    leadAcid: "Lead Acid",
    leadAcidSub: "(50% DoD)",
    lifepo4: "LiFePO4",
    lifepo4Sub: "(85% DoD)",
    systemType: "System Type",
    offGrid: "Off-Grid",
    hybrid: "Hybrid",
    gridTied: "Grid-Tied",
    batteryBank: "Battery Bank",
    batteryBankHint: "Capacity per battery unit",
    systemTypeLabels: {
      "off-grid": "Off-Grid",
      hybrid: "Hybrid",
      "grid-tied": "Grid-Tied",
    },
    systemTypeHints: {
      "off-grid": "Fully independent — no grid connection",
      hybrid: "Battery + grid backup capability",
      "grid-tied": "Grid-connected, no battery storage needed",
    },
    quickInfo: "Quick Info",
    quickInfoItems: [
      "Ah = <code>(kWh × 1000) / Voltage</code> — helps you configure the right battery bank.",
      "Inverter includes a 25% surge headroom above peak load.",
      "Lead-Acid: max 50% DoD. LiFePO4: max 85% DoD.",
      "System efficiency (default 75%) accounts for heat, dust & wiring losses.",
    ],
    systemSummary: "System Summary",
    inverterSize: "Inverter Size",
    storageNeeded: "Storage Needed",
    noBattery: "Not Required",
    solarArray: "Solar Array",
    peakLoad: "Peak Load",
    dailyEnergy: "Daily Energy",
    costEstimate: "Cost Estimate",
    solarPanels: "Solar Panels",
    batteryBankCost: "Battery Bank",
    inverterAcc: "Inverter / Acc.",
    chargeController: "Charge Controller",
    totalEstCost: "Total Est. Cost",
    approxNote:
      "Approximate estimate only. Actual prices vary by brand, region, and supplier. Use this as a planning reference.",
    save: "Save",
    saved: "Saved",
    reset: "Reset",
    share: "Share",
    shareCopied: "Link copied!",
    saveConfigTitle: "Save Configuration",
    configNameLabel: "Configuration Name",
    configNamePlaceholder: "e.g. Summer Cabin",
    saveSettingBtn: "Save Setting",
    cancel: "Cancel",
    savedConfigsTitle: "Saved Configurations",
    noConfigs: "No saved configurations yet.",
    saveSummaryTitle: "System Requirements",
    saveSummaryPrefs: "Preferences",
    saveSummaryActive: "Active Appliances",
    noneSelected: "None selected",
    inv: "Inv",
    pv: "PV",
    units: "units",
    panelsEach: "panels",
    // Warnings
    warnNoLoad: "No appliances selected. Add devices to get a calculation.",
    warnSurge: "Motor loads detected",
    warnSurgeNote:
      "Pumps, ACs, and washing machines draw 3–6× rated watts at startup. Ensure your inverter supports sufficient surge current.",
    warnGridTiedBattery:
      "Grid-Tied mode: battery storage is not required. Shown as 0 kWh.",
    warnHybridBattery:
      "Hybrid mode: battery sized for 50% autonomy — grid covers the rest.",
    // Load breakdown
    loadBreakdownTitle: "Load Breakdown",
    loadBreakdownDesc: "Daily energy consumption per appliance",
    // Compare
    compareTitle: "Compare System Types",
    compareDesc: "Same load across all three configurations",
    showCompare: "Show Comparison",
    hideCompare: "Hide Comparison",
    colOffGrid: "Off-Grid",
    colHybrid: "Hybrid",
    colGridTied: "Grid-Tied",
    rowInverter: "Inverter",
    rowBattery: "Battery",
    rowSolar: "Solar",
    rowCost: "Est. Cost",
  },
  bn: {
    badge: "সোলার পাওয়ার প্ল্যানার",
    title: "সোলার সেটআপ ক্যালকুলেটর",
    appliancesTitle: "দৈনিক যন্ত্রপাতি ও লোড",
    appliancesDesc:
      "প্রতিটি ডিভাইসের পরিমাণ ও দৈনিক ব্যবহারের সময় নির্ধারণ করুন",
    otherAppliances: "অন্যান্য যন্ত্রপাতি",
    showOther: "অন্যান্য যন্ত্রপাতি দেখান",
    hideOther: "অন্যান্য যন্ত্রপাতি লুকান",
    qty: "সংখ্যা",
    hoursPerDay: "ঘণ্টা / দিন",
    wPerUnit: "ওয়াট / ইউনিট",
    totalWatts: "W মোট",
    prefsTitle: "সিস্টেম পছন্দ",
    prefsDesc: "ব্যাটারি, সোলার ও ইনভার্টার প্যারামিটার সামঞ্জস্য করুন",
    backupDuration: "ব্যাকআপ সময়কাল",
    backupHint: "সোলার উৎপাদন ছাড়া শুধু ব্যাটারিতে চলার সময় (রাত/মেঘলা)",
    peakSunHours: "পিক সূর্যালোক সময়",
    peakSunHint: "অবস্থানভিত্তিক সোলার তীব্রতা (দৈনিক গড়)",
    sysEfficiency: "সিস্টেম দক্ষতা",
    sysEfficiencyHint: "তার, ধূলা, তাপ ক্ষতি বিবেচনায়",
    panelWatts: "প্যানেলের আকার",
    panelWattsHint: "প্রতিটি প্যানেলের রেটেড ওয়াটেজ",
    panelType: "প্যানেলের ধরন",
    panelHint: "প্রতি ওয়াট প্যানেলের খরচ প্রভাবিত করে",
    panelStandard: "স্ট্যান্ডার্ড",
    panelMono: "(মনোক্রিস্টালাইন)",
    panelPremium: "প্রিমিয়াম",
    panelPoly: "(পলিক্রিস্টালাইন)",
    batteryType: "ব্যাটারির ধরন",
    batteryHint: "প্রতি kWh ব্যাটারির খরচ প্রভাবিত করে",
    leadAcid: "লিড অ্যাসিড",
    leadAcidSub: "(৫০% DoD)",
    lifepo4: "লিফেপো৪",
    lifepo4Sub: "(৮৫% DoD)",
    systemType: "সিস্টেমের ধরন",
    offGrid: "অফ-গ্রিড",
    hybrid: "হাইব্রিড",
    gridTied: "গ্রিড-টাইড",
    batteryBank: "ব্যাটারি ব্যাংক",
    batteryBankHint: "প্রতি ব্যাটারি ইউনিটের ক্ষমতা",
    systemTypeLabels: {
      "off-grid": "অফ-গ্রিড",
      hybrid: "হাইব্রিড",
      "grid-tied": "গ্রিড-টাইড",
    },
    systemTypeHints: {
      "off-grid": "সম্পূর্ণ স্বাধীন — কোনো গ্রিড সংযোগ নেই",
      hybrid: "ব্যাটারি + গ্রিড ব্যাকআপ সক্ষমতা",
      "grid-tied": "গ্রিড-সংযুক্ত, ব্যাটারি স্টোরেজের প্রয়োজন নেই",
    },
    quickInfo: "দ্রুত তথ্য",
    quickInfoItems: [
      "Ah = <code>(kWh × ১০০০) / ভোল্টেজ</code> — সঠিক ব্যাটারি ব্যাংক কনফিগার করতে সাহায্য করে।",
      "ইনভার্টারে পিক লোডের উপরে ২৫% সার্জ হেডরুম অন্তর্ভুক্ত।",
      "লিড-অ্যাসিড: সর্বোচ্চ ৫০% DoD। লিফেপো৪: সর্বোচ্চ ৮৫% DoD।",
      "সিস্টেম দক্ষতা (ডিফল্ট ৭৫%) তাপ, ধূলা ও তার ক্ষতি হিসাব করে।",
    ],
    systemSummary: "সিস্টেম সারসংক্ষেপ",
    inverterSize: "ইনভার্টারের আকার",
    storageNeeded: "প্রয়োজনীয় স্টোরেজ",
    noBattery: "প্রয়োজন নেই",
    solarArray: "সোলার অ্যারে",
    peakLoad: "পিক লোড",
    dailyEnergy: "দৈনিক শক্তি",
    costEstimate: "খরচের অনুমান",
    solarPanels: "সোলার প্যানেল",
    batteryBankCost: "ব্যাটারি ব্যাংক",
    inverterAcc: "ইনভার্টার / আনুষঙ্গিক",
    chargeController: "চার্জ কন্ট্রোলার",
    totalEstCost: "মোট আনুমানিক খরচ",
    approxNote:
      "শুধুমাত্র আনুমানিক তথ্য। প্রকৃত মূল্য ব্র্যান্ড, অঞ্চল ও সরবরাহকারী অনুযায়ী পরিবর্তিত হয়। পরিকল্পনার রেফারেন্স হিসেবে ব্যবহার করুন।",
    save: "সংরক্ষণ",
    saved: "সংরক্ষিত",
    reset: "রিসেট",
    share: "শেয়ার",
    shareCopied: "লিংক কপি হয়েছে!",
    saveConfigTitle: "কনফিগারেশন সংরক্ষণ",
    configNameLabel: "কনফিগারেশনের নাম",
    configNamePlaceholder: "যেমন: গ্রীষ্মকালীন কেবিন",
    saveSettingBtn: "সেটিং সংরক্ষণ",
    cancel: "বাতিল",
    savedConfigsTitle: "সংরক্ষিত কনফিগারেশন",
    noConfigs: "এখনো কোনো কনফিগারেশন সংরক্ষণ করা হয়নি।",
    saveSummaryTitle: "সিস্টেম প্রয়োজনীয়তা",
    saveSummaryPrefs: "পছন্দ",
    saveSummaryActive: "সক্রিয় যন্ত্রপাতি",
    noneSelected: "কিছু নির্বাচন করা হয়নি",
    inv: "ইনভা",
    pv: "পিভি",
    units: "ইউনিট",
    panelsEach: "প্যানেল",
    warnNoLoad:
      "কোনো যন্ত্রপাতি নির্বাচন করা হয়নি। হিসাব পেতে ডিভাইস যোগ করুন।",
    warnSurge: "মোটর লোড শনাক্ত",
    warnSurgeNote:
      "পাম্প, এসি ও ওয়াশিং মেশিন চালু হওয়ার সময় রেটেড ওয়াটের ৩–৬ গুণ টানতে পারে। ইনভার্টারের সার্জ ক্যাপাসিটি নিশ্চিত করুন।",
    warnGridTiedBattery:
      "গ্রিড-টাইড মোড: ব্যাটারি স্টোরেজের প্রয়োজন নেই। ০ kWh দেখানো হচ্ছে।",
    warnHybridBattery:
      "হাইব্রিড মোড: ৫০% অটোনমির জন্য ব্যাটারি সাইজ করা হয়েছে — বাকিটা গ্রিড দেবে।",
    loadBreakdownTitle: "লোড ব্রেকডাউন",
    loadBreakdownDesc: "প্রতিটি যন্ত্রপাতির দৈনিক শক্তি ব্যবহার",
    compareTitle: "সিস্টেম তুলনা",
    compareDesc: "একই লোডে তিনটি কনফিগারেশন",
    showCompare: "তুলনা দেখান",
    hideCompare: "তুলনা লুকান",
    colOffGrid: "অফ-গ্রিড",
    colHybrid: "হাইব্রিড",
    colGridTied: "গ্রিড-টাইড",
    rowInverter: "ইনভার্টার",
    rowBattery: "ব্যাটারি",
    rowSolar: "সোলার",
    rowCost: "আনু. খরচ",
  },
};
// ─────────────────────────────────────────────────────────────────

function solarCalculator() {
  return {
    appliances: ALL_APPLIANCES,
    commonAppliances: ALL_APPLIANCES.filter((a) => a.category === "common"),
    otherAppliances: ALL_APPLIANCES.filter((a) => a.category === "other"),

    BATTERY_SIZES,
    PANEL_SIZES,
    translations: TRANSLATIONS,

    state: {},
    voltage: 12,
    battAh: 100,
    autonomy: 8,
    sun: 4.5,
    panelWatts: 500,
    sysEfficiency: 75,

    systemType: "off-grid",
    panelType: "mono",
    batteryType: "lead-acid",

    rates: { solarPerW: 22, battPerKwh: 10000, inverterPerKw: 12000 },

    lang: "en",
    darkMode: true,
    isOtherVisible: true,
    isCompareVisible: false,
    saveModalOpen: false,
    loadModalOpen: false,
    newConfigName: "",
    savedConfigs: [],
    shareFeedback: false,

    res: {
      inverter: 0,
      battery: 0,
      battAh: 0,
      battCount: 0,
      panels: 0,
      panelCount: 0,
      totalPeak: 0,
      dailyEnergy: 0,
      ccAmps: 0,
      ccCount: 0,
    },
    cost: { solar: 0, battery: 0, inverter: 0, chargeController: 0, total: 0 },
    compareData: [],

    // Translation helper
    t(key) {
      return this.translations[this.lang][key] ?? key;
    },

    toggleLang() {
      this.lang = this.lang === "en" ? "bn" : "en";
      localStorage.setItem("SSlang", this.lang);
    },

    appName(app) {
      return this.lang === "bn" ? app.name_bn || app.name : app.name;
    },

    init() {
      const savedTheme = localStorage.getItem("SStheme");
      this.darkMode = savedTheme !== null ? savedTheme === "dark" : true;

      const savedLang = localStorage.getItem("SSlang");
      if (savedLang === "en" || savedLang === "bn") this.lang = savedLang;

      this.appliances.forEach((app) => {
        this.state[app.id] = { qty: app.defaultQty, hours: app.hours };
      });

      // Try loading from URL hash first (shared config)
      if (!this._loadFromHash()) {
        // Otherwise restore from last session
        const lastStateStr = localStorage.getItem("SSlastState");
        if (lastStateStr) {
          try {
            this._applyConfig(JSON.parse(lastStateStr));
          } catch (e) {}
        }
      }
      this.calculate();
    },

    _applyConfig(cfg) {
      if (!cfg) return;
      this.autonomy = cfg.autonomy || 8;
      this.sun = cfg.sun || 4.5;
      this.voltage = cfg.voltage || 12;
      this.battAh = cfg.battAh || BATTERY_SIZES[this.voltage][4];
      this.systemType = cfg.systemType || "off-grid";
      this.panelType = cfg.panelType || "mono";
      this.batteryType = cfg.batteryType || "lead-acid";
      this.panelWatts = cfg.panelWatts || 500;
      this.sysEfficiency = cfg.sysEfficiency || 75;
      if (cfg.state) {
        Object.keys(cfg.state).forEach((id) => {
          if (this.state[id]) this.state[id] = cfg.state[id];
        });
      }
    },

    toggleDark() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("SStheme", this.darkMode ? "dark" : "light");
    },

    resetSystem() {
      this.autonomy = 8;
      this.sun = 4.5;
      this.voltage = 12;
      this.battAh = 100;
      this.systemType = "off-grid";
      this.panelType = "mono";
      this.batteryType = "lead-acid";
      this.panelWatts = 500;
      this.sysEfficiency = 75;
      this.appliances.forEach((app) => {
        this.state[app.id] = { qty: app.defaultQty, hours: app.hours };
      });
      this.calculate();
    },

    battCapKwh() {
      return (this.battAh * this.voltage) / 1000;
    },

    availableBattAh() {
      const sizes = BATTERY_SIZES[this.voltage] || [];
      const needed = parseFloat(this.res.battery) || 0;
      if (needed <= 0) return sizes;

      const result = [];
      let ceilingAdded = false;
      for (const ah of sizes) {
        const capKwh = (ah * this.voltage) / 1000;
        if (capKwh <= needed) {
          result.push(ah);
        } else if (!ceilingAdded) {
          result.push(ah);
          ceilingAdded = true;
          break;
        }
      }
      if (!result.includes(this.battAh) && sizes.includes(this.battAh)) {
        const insertAt = result.findIndex((a) => a > this.battAh);
        if (insertAt === -1) result.push(this.battAh);
        else result.splice(insertAt, 0, this.battAh);
      }
      return result.length ? result : sizes;
    },

    systemTypeLabel() {
      return (
        this.translations[this.lang].systemTypeLabels[this.systemType] || ""
      );
    },
    systemTypeHint() {
      return (
        this.translations[this.lang].systemTypeHints[this.systemType] || ""
      );
    },

    getCostRates() {
      const solarPerW = COST_RATES.solar[this.panelType];
      const battPerKwh = COST_RATES.battery[this.batteryType];
      const inverterPerKw = COST_RATES.inverter[this.systemType];
      return { solarPerW, battPerKwh, inverterPerKw };
    },

    setVoltage(v) {
      this.voltage = v;
      const presets = BATTERY_SIZES[v];
      if (!presets.includes(this.battAh)) {
        this.battAh = presets[Math.floor(presets.length / 2)];
      }
      this.calculate();
    },

    updateQty(id, delta) {
      this.state[id].qty = Math.max(0, this.state[id].qty + delta);
      this.calculate();
    },

    formatCost(val) {
      return Math.round(val || 0).toLocaleString("en-IN") + " ৳";
    },

    // Returns true if any surge-prone motor loads are active
    hasSurgingLoads() {
      return this.appliances.some(
        (app) =>
          app.hasSurge && this.state[app.id] && this.state[app.id].qty > 0,
      );
    },

    // Total watts per appliance for inline display
    appTotalWatts(app) {
      const s = this.state[app.id];
      if (!s || s.qty === 0) return "";
      return s.qty * app.watts;
    },

    // Load breakdown sorted by daily kWh contribution
    loadBreakdown() {
      const totalKwh = parseFloat(this.res.dailyEnergy) || 0;
      if (totalKwh === 0) return [];
      return this.appliances
        .map((app) => {
          const s = this.state[app.id];
          if (!s || s.qty === 0) return null;
          const kwh = (s.qty * app.watts * s.hours) / 1000;
          return {
            name: this.appName(app),
            iconColor: app.iconColor,
            kwh: kwh.toFixed(2),
            pct: Math.round((kwh / totalKwh) * 100),
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.kwh - a.kwh);
    },

    // Calculate results for a specific system type (for compare mode)
    _calcForMode(sysType) {
      let totalPeakWatts = 0,
        dailyWattHours = 0;
      this.appliances.forEach((app) => {
        const s = this.state[app.id];
        totalPeakWatts += s.qty * app.watts;
        dailyWattHours += s.qty * app.watts * s.hours;
      });
      const dailyKwh = dailyWattHours / 1000;
      const autonomyDays = this.autonomy / 24;
      const dod = DOD_MAP[this.batteryType];
      const battFactor = SYSTEM_BATTERY_FACTOR[sysType];
      const solarFactor = SYSTEM_SOLAR_FACTOR[sysType];
      const effectiveSun = this.sun * (this.sysEfficiency / 100);

      const inverterKw = Math.ceil((totalPeakWatts * 1.25) / 1000);
      const storageNeeded = ((dailyKwh * autonomyDays) / dod) * battFactor;
      const pvArrayKw = (dailyKwh / effectiveSun) * solarFactor;

      const r = {
        solarPerW: COST_RATES.solar[this.panelType],
        battPerKwh: COST_RATES.battery[this.batteryType],
        inverterPerKw: COST_RATES.inverter[sysType],
      };
      const ccAmps =
        effectiveSun > 0
          ? Math.ceil(((pvArrayKw * 1000) / this.voltage) * 1.25)
          : 0;
      const costCC = ccAmps * COST_RATES.chargeControllerPerAmp;
      const totalCost =
        pvArrayKw * 1000 * r.solarPerW +
        storageNeeded * r.battPerKwh +
        inverterKw * r.inverterPerKw +
        costCC;

      return {
        mode: sysType,
        label: this.translations[this.lang].systemTypeLabels[sysType],
        inverter: inverterKw + " kW",
        battery: battFactor === 0 ? "—" : storageNeeded.toFixed(1) + " kWh",
        solar: pvArrayKw.toFixed(2) + " kW",
        cost: this.formatCost(totalCost),
      };
    },

    buildCompare() {
      this.compareData = ["off-grid", "hybrid", "grid-tied"].map((m) =>
        this._calcForMode(m),
      );
    },

    calculate() {
      let totalPeakWatts = 0,
        dailyWattHours = 0;
      this.appliances.forEach((app) => {
        const s = this.state[app.id];
        totalPeakWatts += s.qty * app.watts;
        dailyWattHours += s.qty * app.watts * s.hours;
      });

      const dailyKwh = dailyWattHours / 1000;
      const autonomyDays = this.autonomy / 24;
      const dod = DOD_MAP[this.batteryType];
      const battFactor = SYSTEM_BATTERY_FACTOR[this.systemType];
      const solarFactor = SYSTEM_SOLAR_FACTOR[this.systemType];
      const effectiveSun = this.sun * (this.sysEfficiency / 100);

      // Inverter: peak load + 25% surge headroom
      const inverterKw = (totalPeakWatts * 1.25) / 1000;
      const finalInverter = Math.ceil(inverterKw);

      // Battery: autonomy hours × daily kWh ÷ DoD × system type factor
      const storageNeeded = ((dailyKwh * autonomyDays) / dod) * battFactor;
      const totalAhNeeded =
        storageNeeded > 0 ? (storageNeeded * 1000) / this.voltage : 0;
      const battCount =
        storageNeeded > 0 ? Math.ceil(storageNeeded / this.battCapKwh()) : 0;

      // Solar: daily energy ÷ effective sun hours × system factor
      const pvArrayKw =
        effectiveSun > 0 ? (dailyKwh / effectiveSun) * solarFactor : 0;
      const panelCount = Math.ceil((pvArrayKw * 1000) / this.panelWatts);

      // Charge Controller: PV array amps × 1.25 safety factor
      const rawCcAmps =
        effectiveSun > 0 ? ((pvArrayKw * 1000) / this.voltage) * 1.25 : 0;
      const ccAmps = Math.ceil(rawCcAmps);
      const ccCount =
        Math.ceil(ccAmps / MAX_CC_AMPS) || (pvArrayKw > 0 ? 1 : 0);

      this.res = {
        inverter: finalInverter,
        battery: storageNeeded.toFixed(1),
        battAh: Math.round(totalAhNeeded),
        battCount: battCount,
        panels: pvArrayKw.toFixed(2),
        panelCount: panelCount,
        totalPeak: totalPeakWatts,
        dailyEnergy: dailyKwh.toFixed(2),
        ccAmps: ccAmps,
        ccCount: ccCount,
      };

      const r = this.getCostRates();
      this.rates = r;
      this.cost.solar = pvArrayKw * 1000 * r.solarPerW;
      this.cost.battery = storageNeeded * r.battPerKwh;
      this.cost.inverter = finalInverter * r.inverterPerKw;
      this.cost.chargeController = ccAmps * COST_RATES.chargeControllerPerAmp;
      this.cost.total =
        this.cost.solar +
        this.cost.battery +
        this.cost.inverter +
        this.cost.chargeController;

      // Rebuild compare data if visible
      if (this.isCompareVisible) this.buildCompare();

      this.saveLastState();
    },

    saveLastState() {
      localStorage.setItem(
        "SSlastState",
        JSON.stringify(this._currentConfig()),
      );
    },

    _currentConfig() {
      return {
        state: this.state,
        autonomy: this.autonomy,
        sun: this.sun,
        voltage: this.voltage,
        battAh: this.battAh,
        systemType: this.systemType,
        panelType: this.panelType,
        batteryType: this.batteryType,
        panelWatts: this.panelWatts,
        sysEfficiency: this.sysEfficiency,
      };
    },

    // ── Share via URL hash ────────────────────────────────────────
    shareConfig() {
      try {
        const encoded = btoa(JSON.stringify(this._currentConfig()));
        const url = location.origin + location.pathname + "#share=" + encoded;
        navigator.clipboard.writeText(url).catch(() => {});
        history.replaceState(null, "", "#share=" + encoded);
        this.shareFeedback = true;
        setTimeout(() => {
          this.shareFeedback = false;
        }, 2500);
      } catch (e) {}
    },

    _loadFromHash() {
      const hash = location.hash;
      if (!hash.startsWith("#share=")) return false;
      try {
        const cfg = JSON.parse(atob(hash.slice(7)));
        this._applyConfig(cfg);
        return true;
      } catch (e) {
        return false;
      }
    },
    // ─────────────────────────────────────────────────────────────

    getActiveAppliancesList() {
      return this.appliances
        .filter((app) => this.state[app.id] && this.state[app.id].qty > 0)
        .map(
          (app) =>
            `• ${this.appName(app)} ×${this.state[app.id].qty} (${this.state[app.id].hours}h/d)`,
        );
    },

    refreshSavedConfigs() {
      const configs = localStorage.getItem("SSsavedConfigs");
      this.savedConfigs = configs ? JSON.parse(configs).reverse() : [];
    },

    saveConfiguration() {
      const name = this.newConfigName.trim();
      if (!name) {
        alert("Please enter a name for the configuration.");
        return;
      }
      this.refreshSavedConfigs();
      const configToSave = {
        id: Date.now(),
        name: name,
        date: new Date().toLocaleDateString(),
        data: this._currentConfig(),
        summary: {
          inverter: this.res.inverter + " kW",
          storage: this.res.battery + " kWh",
          pv: this.res.panels + " kW",
          cost: this.formatCost(this.cost.total),
        },
      };
      const rawList = localStorage.getItem("SSsavedConfigs");
      const parsedList = rawList ? JSON.parse(rawList) : [];
      parsedList.push(configToSave);
      localStorage.setItem("SSsavedConfigs", JSON.stringify(parsedList));
      this.saveModalOpen = false;
    },

    loadConfig(c) {
      const data = c.data;
      if (!data) return;
      this._applyConfig(data);
      this.calculate();
      this.loadModalOpen = false;
    },
  };
}

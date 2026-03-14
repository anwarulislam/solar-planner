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

    systemType: "mppt",
    panelType: "mono",
    batteryType: "lifepo4",

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
      const rawSysType = cfg.systemType || "mppt";
      this.systemType = rawSysType;
      this.panelType = cfg.panelType || "mono";
      this.batteryType = cfg.batteryType || "lifepo4";
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
      this.systemType = "mppt";
      this.panelType = "mono";
      this.batteryType = "lifepo4";
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
      const ccPerAmp = COST_RATES.chargeController[this.systemType];
      return { solarPerW, battPerKwh, inverterPerKw, ccPerAmp };
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

    // Calculate results for a specific controller type (for compare mode)
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
      const mpptBonus = MPPT_EFFICIENCY_BONUS[sysType];
      const effectiveSun = this.sun * (this.sysEfficiency / 100) * mpptBonus;

      const inverterKw = Math.ceil((totalPeakWatts * 1.25) / 1000);
      const storageNeeded = ((dailyKwh * autonomyDays) / dod) * battFactor;
      const pvArrayKw =
        effectiveSun > 0 ? (dailyKwh / effectiveSun) * solarFactor : 0;

      const solarPerW = COST_RATES.solar[this.panelType];
      const battPerKwh = COST_RATES.battery[this.batteryType];
      const inverterPerKw = COST_RATES.inverter[sysType];
      const ccPerAmp = COST_RATES.chargeController[sysType];

      const ccAmps =
        effectiveSun > 0
          ? Math.ceil(((pvArrayKw * 1000) / this.voltage) * 1.25)
          : 0;
      const costCC = ccAmps * ccPerAmp;
      const totalCost =
        pvArrayKw * 1000 * solarPerW +
        storageNeeded * battPerKwh +
        inverterKw * inverterPerKw +
        costCC;

      return {
        mode: sysType,
        label: this.translations[this.lang].systemTypeLabels[sysType],
        inverter: inverterKw + " kW",
        battery: storageNeeded.toFixed(1) + " kWh",
        solar: pvArrayKw.toFixed(2) + " kW",
        cost: this.formatCost(totalCost),
      };
    },

    buildCompare() {
      this.compareData = ["pwm", "mppt", "hybrid"].map((m) =>
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
      const mpptBonus = MPPT_EFFICIENCY_BONUS[this.systemType];
      const effectiveSun = this.sun * (this.sysEfficiency / 100) * mpptBonus;

      // Inverter: peak load + 25% surge headroom
      const inverterKw = (totalPeakWatts * 1.25) / 1000;
      const finalInverter = Math.ceil(inverterKw);

      // Battery: autonomy hours × daily kWh ÷ DoD × controller type factor
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
      this.cost.chargeController = ccAmps * r.ccPerAmp;
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

    // ── Share via canvas image ────────────────────────────────────
    shareConfig() {
      // Still encode share hash in URL for loading shared configs
      try {
        const encoded = btoa(JSON.stringify(this._currentConfig()));
        history.replaceState(null, "", "#share=" + encoded);
      } catch (e) {}

      // Build canvas summary image
      const isDark = this.darkMode;
      const bgColor = isDark ? "#0f172a" : "#f8fafc";
      const cardBg = isDark ? "#1e293b" : "#ffffff";
      const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
      const textDim = isDark ? "#94a3b8" : "#64748b";
      const accent = "#f59e0b";
      const blue = "#60a5fa";
      const purple = "#a78bfa";
      const orange = "#fb923c";
      const green = "#4ade80";

      const W = 640,
        H = 480;
      const canvas = document.createElement("canvas");
      canvas.width = W * 2;
      canvas.height = H * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      // Header band
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#f59e0b");
      grad.addColorStop(1, "#f97316");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, 56);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px Inter, sans-serif";
      ctx.fillText("☀  Solar Setup Calculator", 20, 22);
      ctx.font = "400 12px Inter, sans-serif";
      ctx.globalAlpha = 0.85;
      ctx.fillText("System Summary", 20, 42);
      ctx.globalAlpha = 1;

      // Controller badge
      const ctrlLabel =
        this.translations[this.lang].systemTypeLabels[this.systemType] ||
        this.systemType;
      ctx.font = "bold 11px Inter, sans-serif";
      const bw = ctx.measureText(ctrlLabel).width + 16;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.roundRect(W - bw - 12, 18, bw, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(ctrlLabel, W - bw - 4, 33);

      // Card helper
      const drawCard = (x, y, w, h, color, icon, label, value, sub) => {
        ctx.fillStyle = cardBg;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 10);
        ctx.fill();
        // Accent bar
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, 4, h, [10, 0, 0, 10]);
        ctx.fill();
        // Icon circle
        ctx.fillStyle = color + "33";
        ctx.beginPath();
        ctx.arc(x + 22, y + 22, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.fillText(icon, x + 16, y + 27);
        // Label
        ctx.fillStyle = textDim;
        ctx.font = "400 11px Inter, sans-serif";
        ctx.fillText(label, x + 42, y + 18);
        // Value
        ctx.fillStyle = color;
        ctx.font = "bold 20px Inter, sans-serif";
        ctx.fillText(value, x + 42, y + 38);
        // Sub
        if (sub) {
          ctx.fillStyle = textDim;
          ctx.font = "400 10px Inter, sans-serif";
          ctx.fillText(sub, x + 42, y + 52);
        }
      };

      const lang = this.translations[this.lang];
      const cw = (W - 48) / 2;
      const ch = 70;
      const row1y = 72;
      const row2y = row1y + ch + 8;

      drawCard(
        16,
        row1y,
        cw,
        ch,
        blue,
        "⚡",
        lang.inverterSize,
        this.res.inverter + " kW",
        lang.peakLoad + ": " + this.res.totalPeak + "W",
      );
      drawCard(
        24 + cw,
        row1y,
        cw,
        ch,
        purple,
        "🔋",
        lang.storageNeeded,
        this.res.battery + " kWh",
        this.res.battAh +
          " Ah @ " +
          this.voltage +
          "V · " +
          this.res.battCount +
          " " +
          lang.units,
      );
      drawCard(
        16,
        row2y,
        cw,
        ch,
        orange,
        "☀",
        lang.solarArray,
        this.res.panels + " kW",
        this.res.panelCount + " panels × " + this.panelWatts + "W",
      );
      drawCard(
        24 + cw,
        row2y,
        cw,
        ch,
        green,
        "📆",
        lang.dailyEnergy,
        this.res.dailyEnergy + " kWh",
        lang.peakSunHours +
          ": " +
          this.sun +
          "h  ·  " +
          lang.sysEfficiency +
          ": " +
          this.sysEfficiency +
          "%",
      );

      // Cost section
      const cy = row2y + ch + 12;
      ctx.fillStyle = cardBg;
      ctx.beginPath();
      ctx.roundRect(16, cy, W - 32, 72, 10);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(16, cy, 4, 72, [10, 0, 0, 10]);
      ctx.fill();
      ctx.fillStyle = textDim;
      ctx.font = "400 11px Inter, sans-serif";
      ctx.fillText(lang.costEstimate, 28, cy + 16);
      ctx.fillStyle = accent;
      ctx.font = "bold 26px Inter, sans-serif";
      ctx.fillText(this.formatCost(this.cost.total), 28, cy + 44);
      // Cost breakdown
      const items = [
        [lang.solarPanels, this.formatCost(this.cost.solar), orange],
        [lang.batteryBankCost, this.formatCost(this.cost.battery), purple],
        [lang.inverterAcc, this.formatCost(this.cost.inverter), blue],
        [
          lang.chargeController,
          this.formatCost(this.cost.chargeController),
          green,
        ],
      ];
      let bx = 230;
      items.forEach(([lbl, val, col]) => {
        ctx.fillStyle = textDim;
        ctx.font = "400 9px Inter, sans-serif";
        ctx.fillText(lbl, bx, cy + 22);
        ctx.fillStyle = col;
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.fillText(val, bx, cy + 38);
        bx += 100;
      });

      // Footer
      ctx.fillStyle = textDim;
      ctx.font = "400 10px Inter, sans-serif";
      ctx.fillText("anwar.bd · Solar Setup Calculator", 16, H - 10);
      ctx.fillText(new Date().toLocaleDateString(), W - 90, H - 10);

      // Copy to clipboard as blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ "image/png": blob });
          navigator.clipboard.write([item]).catch(() => {});
        } catch (e) {}
      }, "image/png");

      this.shareFeedback = true;
      setTimeout(() => {
        this.shareFeedback = false;
      }, 2500);
    },

    _loadFromHash() {
      return false;
      // for now disable this feature
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

function solarCalculator() {
  return {
    appliances: ALL_APPLIANCES,
    commonAppliances: ALL_APPLIANCES.filter((a) => a.category === "common"),
    otherAppliances: ALL_APPLIANCES.filter((a) => a.category === "other"),

    BATTERY_SIZES,
    PANEL_SIZES,
    translations: TRANSLATIONS,

    state: {},
    voltage: DEFAULTS.voltage,
    battAh: DEFAULTS.battAh,
    autonomy: DEFAULTS.autonomy,
    sun: DEFAULTS.sun,
    panelWatts: DEFAULTS.panelWatts,
    sysEfficiency: DEFAULTS.sysEfficiency,

    systemType: DEFAULTS.systemType,
    panelType: DEFAULTS.panelType,
    batteryType: DEFAULTS.batteryType,

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
      this.autonomy = cfg.autonomy ?? DEFAULTS.autonomy;
      this.sun = cfg.sun ?? DEFAULTS.sun;
      this.voltage = cfg.voltage ?? DEFAULTS.voltage;
      this.battAh = cfg.battAh ?? BATTERY_SIZES[this.voltage][4];
      this.systemType = cfg.systemType ?? DEFAULTS.systemType;
      this.panelType = cfg.panelType ?? DEFAULTS.panelType;
      this.batteryType = cfg.batteryType ?? DEFAULTS.batteryType;
      this.panelWatts = cfg.panelWatts ?? DEFAULTS.panelWatts;
      this.sysEfficiency = cfg.sysEfficiency ?? DEFAULTS.sysEfficiency;
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
      this.autonomy = DEFAULTS.autonomy;
      this.sun = DEFAULTS.sun;
      this.voltage = DEFAULTS.voltage;
      this.battAh = DEFAULTS.battAh;
      this.systemType = DEFAULTS.systemType;
      this.panelType = DEFAULTS.panelType;
      this.batteryType = DEFAULTS.batteryType;
      this.panelWatts = DEFAULTS.panelWatts;
      this.sysEfficiency = DEFAULTS.sysEfficiency;
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

    // ── Share via DOM → canvas → clipboard ───────────────────────
    async shareConfig() {
      // Build the share card element
      const card = document.getElementById("share-card");
      if (!card) return;

      // Temporarily make it visible for capture
      card.style.display = "block";

      try {
        // Use html2canvas to capture the card
        const canvas = await html2canvas(card, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        });

        card.style.display = "none";

        canvas.toBlob(async (blob) => {
          if (!blob) return;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
          } catch (e) {
            // Fallback: open in new tab so user can save manually
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");
          }
        }, "image/png");

        this.shareFeedback = true;
        setTimeout(() => {
          this.shareFeedback = false;
        }, 2500);
      } catch (e) {
        card.style.display = "none";
      }
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

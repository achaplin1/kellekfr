(() => {
  const VERSION = '2.0.0';
  const SAVE_KEY = 'chronoforge-idle-save';
  const TICK_MS = 200;
  const AUTO_SAVE_MS = 30000;
  const MAX_OFFLINE_MS = 1000 * 60 * 60 * 12;
  const ASCEND_REQUIREMENT = 100_000;
  const ASCEND_FLUX_COST = 1_000;

  const automationData = [
    {
      key: 'drones',
      name: 'Drones focaliseurs',
      description: 'Des essaims stabilisent le flux ambiant.',
      baseCost: 15,
      costMult: 1.12,
      costResource: 'flux',
      baseProduction: { flux: 1 },
      unlock: () => true,
    },
    {
      key: 'siphons',
      name: 'Siphons harmoniques',
      description: 'Convertit le flux en inspiration condensée.',
      baseCost: 120,
      costMult: 1.15,
      costResource: 'flux',
      baseProduction: { insight: 0.55 },
      consumes: { flux: 0.9 },
      unlock: (state) => state.stats.fluxLifetime >= 50,
    },
    {
      key: 'chrono',
      name: 'Forges temporelles',
      description: 'Cristallise les visions en fragments de temps.',
      baseCost: 480,
      costMult: 1.17,
      costResource: 'insight',
      baseProduction: { shards: 0.22 },
      consumes: { insight: 0.65 },
      unlock: (state) => Boolean(state.researchCompleted.rift_studies),
    },
    {
      key: 'oracles',
      name: 'Oracles du Néant',
      description: 'Convoque lentement des clés d\'invocation.',
      baseCost: 2200,
      costMult: 1.2,
      costResource: 'insight',
      baseProduction: { tokens: 0.05 },
      consumes: { flux: 2.4 },
      unlock: (state) => Boolean(state.researchCompleted.void_beacons),
    },
    {
      key: 'paradox',
      name: 'Moteurs de paradoxe',
      description: 'Amplifie chaque automatisation (+5%/niveau).',
      baseCost: 6400,
      costMult: 1.25,
      costResource: 'shards',
      baseProduction: {},
      unlock: (state) => Boolean(state.researchCompleted.eternal_computation),
    },
  ];

  const researchData = [
    {
      key: 'codex_flux',
      name: 'Codex du Flux',
      description: 'Double le flux obtenu manuellement.',
      effect: 'Flux manuel x2',
      cost: { insight: 55 },
      unlock: (state) => state.stats.fluxLifetime >= 20,
    },
    {
      key: 'triangulation',
      name: 'Triangulation harmonique',
      description: 'Augmente l\'efficacité de toutes les automations.',
      effect: '+15% de production automatisée',
      cost: { insight: 160 },
      unlock: (state) => Boolean(state.researchCompleted.codex_flux),
    },
    {
      key: 'rift_studies',
      name: 'Études du Néant',
      description: 'Ouvre la voie aux fragments de temps et aux invocations.',
      effect: 'Débloque les forges temporelles et +15% fragments',
      cost: { insight: 360 },
      unlock: (state) => state.stats.fluxLifetime >= 420,
    },
    {
      key: 'void_beacons',
      name: 'Balises du Néant',
      description: 'Optimise la production de clés.',
      effect: '+50% de production de clés',
      cost: { insight: 1350, shards: 18 },
      unlock: (state) => Boolean(state.researchCompleted.rift_studies),
    },
    {
      key: 'eternal_computation',
      name: 'Calcul éternel',
      description: 'Déverrouille les moteurs de paradoxe et booste les fragments.',
      effect: 'Débloque les moteurs +25% fragments',
      cost: { insight: 3200, shards: 85 },
      unlock: (state) => Boolean(state.researchCompleted.void_beacons),
    },
    {
      key: 'time_dilation',
      name: 'Dilatation temporelle',
      description: 'Amplifie la progression hors-ligne et l\'essence.',
      effect: '+50% hors-ligne et +25% essence',
      cost: { insight: 7200, shards: 210 },
      unlock: (state) => state.ascensions > 0,
    },
  ];

  const artifactEffects = [
    {
      key: 'flux',
      name: 'Catalyseur de Flux',
      description: (value) => `Production de flux +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.flux *= 1 + value;
        bonuses.manualFlux *= 1 + value * 0.6;
      },
    },
    {
      key: 'insight',
      name: 'Parchemin mémoriel',
      description: (value) => `Gain d'inspiration +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.insight *= 1 + value;
      },
    },
    {
      key: 'tokens',
      name: 'Balise d\'appel',
      description: (value) => `Clés d'invocation +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.tokens *= 1 + value;
      },
    },
    {
      key: 'shards',
      name: 'Cadran éclaté',
      description: (value) => `Fragments de temps +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.shards *= 1 + value;
      },
    },
    {
      key: 'omni',
      name: 'Prisme de convergence',
      description: (value) => `Tous gains +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.global *= 1 + value;
      },
    },
    {
      key: 'luck',
      name: 'Étoile captive',
      description: (value) => `Chance de rareté +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.gachaLuck += value;
      },
    },
    {
      key: 'offline',
      name: 'Pendentif inerte',
      description: (value) => `Progression hors-ligne +${(value * 100).toFixed(1)}%`,
      apply: (bonuses, value) => {
        bonuses.offline *= 1 + value;
      },
    },
  ];

  const rarityData = [
    { key: 'common', name: 'Commun', weight: 60, luckFactor: 0.75, valueRange: [0.05, 0.09] },
    { key: 'uncommon', name: 'Peu commun', weight: 24, luckFactor: 1.0, valueRange: [0.09, 0.15] },
    { key: 'rare', name: 'Rare', weight: 10, luckFactor: 1.4, valueRange: [0.15, 0.24] },
    { key: 'legendary', name: 'Légendaire', weight: 5, luckFactor: 1.8, valueRange: [0.24, 0.38] },
    { key: 'mythic', name: 'Mythique', weight: 1, luckFactor: 2.3, valueRange: [0.38, 0.6] },
  ];

  const achievementData = [
    {
      key: 'first_steps',
      name: 'Premières étincelles',
      description: 'Accumuler 100 flux.',
      check: (state) => state.stats.fluxLifetime >= 100,
    },
    {
      key: 'automation',
      name: 'Première usine',
      description: 'Posséder 25 automations au total.',
      check: (state) => state.automations.reduce((sum, v) => sum + v, 0) >= 25,
    },
    {
      key: 'gacha',
      name: 'Voyageur du Néant',
      description: 'Effectuer 20 invocations.',
      check: (state) => state.stats.summons >= 20,
    },
    {
      key: 'artifact_collector',
      name: 'Conservateur',
      description: 'Rassembler 10 artéfacts uniques.',
      check: (state) => state.artifacts.length >= 10,
    },
    {
      key: 'ascend',
      name: 'Nouveau cycle',
      description: 'Accomplir une ascension.',
      check: (state) => state.ascensions >= 1,
    },
    {
      key: 'flux_million',
      name: 'Forge d\'étoiles',
      description: 'Accumuler 1 000 000 flux au total.',
      check: (state) => state.stats.fluxLifetime >= 1_000_000,
    },
    {
      key: 'offline',
      name: 'Chrononaute',
      description: 'Profiter d\'au moins 6 heures de progression hors-ligne.',
      check: (state) => state.stats.offlineMs >= 1000 * 60 * 60 * 6,
    },
  ];

  const defaultState = () => ({
    version: VERSION,
    flux: 0,
    insight: 0,
    shards: 0,
    tokens: 0,
    eternity: 0,
    automations: automationData.map(() => 0),
    researchCompleted: {},
    artifacts: [],
    duplicates: {},
    achievementsUnlocked: [],
    stats: {
      fluxLifetime: 0,
      insightLifetime: 0,
      shardsLifetime: 0,
      tokensLifetime: 0,
      manualClicks: 0,
      summons: 0,
      offlineMs: 0,
    },
    ascensions: 0,
    lastUpdate: Date.now(),
    lastSave: Date.now(),
    rateAccumulator: {
      flux: { sum: 0, time: 0 },
      insight: { sum: 0, time: 0 },
      shards: { sum: 0, time: 0 },
      tokens: { sum: 0, time: 0 },
    },
    rates: {
      flux: 0,
      insight: 0,
      shards: 0,
      tokens: 0,
    },
    bonuses: baselineBonuses(0),
  });

  function baselineBonuses(eternity) {
    return {
      manualFlux: 1,
      automation: 1,
      flux: 1,
      insight: 1,
      shards: 1,
      tokens: 1,
      global: 1 + eternity * 0.05,
      gachaLuck: 0,
      offline: 1,
    };
  }

  let state = defaultState();
  let needsBonusRecalc = true;
  let uiNeedsRefresh = true;
  let lastUiUpdate = 0;

  const gatherButton = document.querySelector('#gather-core');
  const manualBonus = document.querySelector('#manual-bonus');
  const resourceElements = {
    flux: document.querySelector('[data-resource="flux"]'),
    insight: document.querySelector('[data-resource="insight"]'),
    shards: document.querySelector('[data-resource="shards"]'),
    tokens: document.querySelector('[data-resource="tokens"]'),
  };
  const resourceCounts = {
    flux: document.querySelector('#flux-count'),
    insight: document.querySelector('#insight-count'),
    shards: document.querySelector('#shards-count'),
    tokens: document.querySelector('#tokens-count'),
  };
  const resourceRates = {
    flux: document.querySelector('#flux-rate'),
    insight: document.querySelector('#insight-rate'),
    shards: document.querySelector('#shards-rate'),
    tokens: document.querySelector('#tokens-rate'),
  };

  const versionSpan = document.querySelector('#version');
  const eternityCount = document.querySelector('#eternity-count');
  const eternityMult = document.querySelector('#eternity-mult');
  const ascendCount = document.querySelector('#ascend-count');
  const ascendProgress = document.querySelector('#ascend-progress');
  const ascendEstimate = document.querySelector('#ascend-estimate');
  const fluxLifetime = document.querySelector('#flux-lifetime');
  const ascendButton = document.querySelector('#ascend-button');
  const eventLog = document.querySelector('#event-log');

  const automationGrid = document.querySelector('#automation-grid');
  const researchGrid = document.querySelector('#research-grid');
  const gachaResults = document.querySelector('#gacha-results');
  const artifactInventory = document.querySelector('#artifact-inventory');
  const achievementList = document.querySelector('#achievement-list');

  const pullOnceButton = document.querySelector('#pull-once');
  const pullTenButton = document.querySelector('#pull-ten');
  const salvageButton = document.querySelector('#salvage-duplicates');

  const exportButton = document.querySelector('#export-save');
  const importButton = document.querySelector('#import-save');
  const wipeButton = document.querySelector('#wipe-save');
  const saveDataArea = document.querySelector('#save-data');

  const automationTemplate = document.querySelector('#automation-card-template');
  const researchTemplate = document.querySelector('#research-card-template');
  const achievementTemplate = document.querySelector('#achievement-template');

  const automationCards = [];
  const researchCards = [];
  const achievementCards = [];

  function formatNumber(value) {
    if (value >= 1e12) return (value / 1e12).toFixed(2) + 't';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'g';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'm';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'k';
    if (value === 0) return '0';
    if (Math.abs(value) < 0.01) return value.toFixed(4);
    return value.toFixed(2);
  }

  function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    if (minutes > 0) {
      return `${minutes}min`;
    }
    return `${Math.max(1, Math.floor(totalSeconds))}s`;
  }

  function computeOrbFill(value) {
    if (value <= 0) return '0%';
    if (value < 1) return `${Math.min(100, value * 100)}%`;
    const log = Math.log10(value);
    const base = Math.floor(log);
    const ratio = log - base;
    return `${Math.min(100, Math.max(0, ratio * 100))}%`;
  }

  function addToRate(resource, amount, seconds) {
    const acc = state.rateAccumulator[resource];
    if (!acc) return;
    acc.sum += amount;
    acc.time += seconds;
    if (acc.time >= 0.5) {
      state.rates[resource] = acc.sum / Math.max(acc.time, 0.001);
      acc.sum = 0;
      acc.time = 0;
      uiNeedsRefresh = true;
    }
  }

  function calculateAutomationCost(index) {
    const data = automationData[index];
    const level = state.automations[index];
    return data.baseCost * Math.pow(data.costMult, level);
  }

  function canAfford(cost, resource) {
    return state[resource] >= cost - 1e-9;
  }

  function spend(cost, resource) {
    state[resource] -= cost;
  }

  function recalcBonuses() {
    const bonuses = baselineBonuses(state.eternity);

    if (state.researchCompleted.codex_flux) bonuses.manualFlux *= 2;
    if (state.researchCompleted.triangulation) bonuses.automation *= 1.15;
    if (state.researchCompleted.rift_studies) {
      bonuses.shards *= 1.15;
      bonuses.tokens *= 1.15;
    }
    if (state.researchCompleted.void_beacons) bonuses.tokens *= 1.5;
    if (state.researchCompleted.eternal_computation) bonuses.shards *= 1.25;
    if (state.researchCompleted.time_dilation) {
      bonuses.offline *= 1.5;
      bonuses.global *= 1.1;
    }

    state.artifacts.forEach((artifact) => {
      const effect = artifactEffects.find((e) => e.key === artifact.effectKey);
      if (effect) {
        effect.apply(bonuses, artifact.value * artifact.stacks);
      }
    });

    const paradoxIndex = automationData.findIndex((a) => a.key === 'paradox');
    if (paradoxIndex >= 0) {
      const paradoxLevel = state.automations[paradoxIndex];
      if (paradoxLevel > 0) bonuses.automation *= 1 + paradoxLevel * 0.05;
    }

    state.bonuses = bonuses;
    needsBonusRecalc = false;
  }

  function gatherFlux() {
    if (needsBonusRecalc) recalcBonuses();
    const gain = 1 * state.bonuses.manualFlux * state.bonuses.flux * state.bonuses.global;
    state.flux += gain;
    state.stats.fluxLifetime += gain;
    state.stats.manualClicks += 1;
    addToRate('flux', gain, 0.01);
    uiNeedsRefresh = true;
    visualPulse(gatherButton);
  }

  function processTick(deltaMs) {
    if (needsBonusRecalc) recalcBonuses();
    const seconds = deltaMs / 1000;
    const automationMultiplier = state.bonuses.automation * state.bonuses.global;

    automationData.forEach((data, index) => {
      const level = state.automations[index];
      if (!level || !data.baseProduction) return;

      let ratio = 1;
      if (data.consumes) {
        Object.entries(data.consumes).forEach(([resource, amount]) => {
          const needed = amount * level * seconds * automationMultiplier;
          if (needed <= 0) return;
          ratio = Math.min(ratio, state[resource] > 0 ? state[resource] / needed : 0);
        });
      }
      if (ratio <= 0) return;

      if (data.consumes) {
        Object.entries(data.consumes).forEach(([resource, amount]) => {
          const consume = amount * level * seconds * automationMultiplier * ratio;
          state[resource] = Math.max(0, state[resource] - consume);
        });
      }

      Object.entries(data.baseProduction).forEach(([resource, amount]) => {
        const resourceMultiplier = state.bonuses[resource] || 1;
        const produced = amount * level * seconds * automationMultiplier * resourceMultiplier * ratio;
        if (produced <= 0) return;
        state[resource] += produced;
        const statKey = `${resource}Lifetime`;
        if (state.stats.hasOwnProperty(statKey)) {
          state.stats[statKey] += produced;
        }
        addToRate(resource, produced, seconds);
      });
    });
  }

  function processResources(deltaMs) {
    if (needsBonusRecalc) recalcBonuses();
    const offlineCap = MAX_OFFLINE_MS * state.bonuses.offline;
    const cappedDelta = Math.min(deltaMs, offlineCap);
    if (deltaMs > TICK_MS * 2) state.stats.offlineMs += deltaMs;
    let remaining = cappedDelta;
    while (remaining > 0) {
      const step = Math.min(TICK_MS, remaining);
      processTick(step);
      remaining -= step;
    }
  }

  function updateAutomationsUI() {
    automationCards.forEach((card, index) => {
      const data = automationData[index];
      const level = state.automations[index];
      const unlocked = data.unlock(state);
      const cost = calculateAutomationCost(index);
      card.root.classList.toggle('locked', !unlocked);
      card.root.classList.toggle('level-boost', level > 0);
      card.level.textContent = `Niveau ${level}`;
      card.desc.textContent = data.description;
      const productionText = Object.entries(data.baseProduction || {})
        .map(([resource, value]) => `${formatNumber(value)} ${resource}/s`)
        .join(' + ') || 'Boost passif';
      card.effect.textContent = productionText;
      card.cost.textContent = `Coût : ${formatNumber(cost)} ${data.costResource}`;
      card.button.textContent = unlocked ? 'Installer' : 'Verrouillé';
      card.button.disabled = !unlocked || !canAfford(cost, data.costResource);
    });
  }

  function updateResearchUI() {
    researchCards.forEach((card, index) => {
      const data = researchData[index];
      const unlocked = data.unlock(state);
      const completed = Boolean(state.researchCompleted[data.key]);
      card.root.classList.toggle('locked', !unlocked);
      card.root.classList.toggle('level-boost', completed);
      card.status.textContent = completed ? 'Intégrée' : unlocked ? 'Disponible' : 'Verrouillée';
      card.desc.textContent = data.description;
      card.effect.textContent = data.effect;
      const costs = Object.entries(data.cost)
        .map(([resource, value]) => `${formatNumber(value)} ${resource}`)
        .join(' · ');
      card.cost.textContent = `Coût : ${costs}`;
      card.button.textContent = completed ? 'Acquise' : 'Lancer';
      card.button.disabled = completed || !unlocked || !Object.entries(data.cost).every(([resource, value]) => canAfford(value, resource));
    });
  }

  function updateResourcesUI() {
    Object.entries(resourceCounts).forEach(([key, element]) => {
      element.textContent = formatNumber(state[key]);
    });
    Object.entries(resourceRates).forEach(([key, element]) => {
      element.textContent = `+${formatNumber(state.rates[key])} /s`;
    });
    Object.entries(resourceElements).forEach(([key, element]) => {
      const fill = computeOrbFill(state[key]);
      element.style.setProperty('--orb-fill', fill);
    });

    eternityCount.textContent = formatNumber(state.eternity);
    eternityMult.textContent = `${state.bonuses.global.toFixed(2)}x`;
    ascendCount.textContent = state.ascensions;

    const progress = Math.min(1, state.stats.fluxLifetime / ASCEND_REQUIREMENT);
    ascendProgress.style.width = `${(progress * 100).toFixed(1)}%`;

    const essenceBase = Math.max(1, Math.floor(Math.pow(Math.max(state.stats.fluxLifetime, ASCEND_REQUIREMENT) / ASCEND_REQUIREMENT, 0.6)));
    const essenceGain = state.researchCompleted.time_dilation ? Math.floor(essenceBase * 1.25) : essenceBase;
    ascendEstimate.textContent = formatNumber(essenceGain);
    fluxLifetime.textContent = formatNumber(state.stats.fluxLifetime);

    manualBonus.textContent = `x${(state.bonuses.manualFlux * state.bonuses.global).toFixed(2)}`;
    ascendButton.disabled = !canAscend();
  }

  function updateAchievementsUI() {
    achievementCards.forEach((card, index) => {
      const achievement = achievementData[index];
      const unlocked = state.achievementsUnlocked.includes(achievement.key);
      card.root.classList.toggle('unlocked', unlocked);
    });
  }

  function updateArtifactInventory() {
    artifactInventory.innerHTML = '';
    state.artifacts.forEach((artifact) => {
      const effect = artifactEffects.find((e) => e.key === artifact.effectKey);
      const item = document.createElement('div');
      item.className = 'artifact-item';
      item.innerHTML = `
        <strong>${effect ? effect.name : artifact.effectKey}</strong>
        <span>${effect ? effect.description(artifact.value * artifact.stacks) : ''}</span>
        <span>Stacks : ${artifact.stacks}</span>
      `;
      artifactInventory.appendChild(item);
    });
  }

  function updateUI(now) {
    if (needsBonusRecalc) recalcBonuses();
    if (!uiNeedsRefresh && now - lastUiUpdate < 250) return;
    uiNeedsRefresh = false;
    lastUiUpdate = now;
    updateResourcesUI();
    updateAutomationsUI();
    updateResearchUI();
    updateAchievementsUI();
    updateArtifactInventory();
  }

  function canAscend() {
    return state.stats.fluxLifetime >= ASCEND_REQUIREMENT && state.flux >= ASCEND_FLUX_COST;
  }

  function performAscension() {
    if (!canAscend()) return;
    if (needsBonusRecalc) recalcBonuses();
    const essenceBase = Math.max(1, Math.floor(Math.pow(state.stats.fluxLifetime / ASCEND_REQUIREMENT, 0.6)));
    const essenceGain = state.researchCompleted.time_dilation ? Math.floor(essenceBase * 1.25) : essenceBase;
    state.eternity += essenceGain;
    state.ascensions += 1;
    state.flux = 0;
    state.insight = 0;
    state.shards = 0;
    state.tokens = 0;
    state.automations = automationData.map(() => 0);
    state.rateAccumulator = {
      flux: { sum: 0, time: 0 },
      insight: { sum: 0, time: 0 },
      shards: { sum: 0, time: 0 },
      tokens: { sum: 0, time: 0 },
    };
    state.rates = { flux: 0, insight: 0, shards: 0, tokens: 0 };
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
    logMessage(`Ascension accomplie · Essence +${formatNumber(essenceGain)}`, 'legendary');
  }

  function createAutomationCards() {
    automationGrid.innerHTML = '';
    automationData.forEach((data, index) => {
      const fragment = automationTemplate.content.cloneNode(true);
      const card = fragment.querySelector('.card');
      const title = fragment.querySelector('.card-title');
      const level = fragment.querySelector('.card-level');
      const desc = fragment.querySelector('.card-desc');
      const effect = fragment.querySelector('.card-effect');
      const cost = fragment.querySelector('.card-cost');
      const button = fragment.querySelector('.card-action');
      title.textContent = data.name;
      button.addEventListener('click', () => buyAutomation(index));
      automationGrid.appendChild(fragment);
      automationCards[index] = { root: card, level, desc, effect, cost, button };
    });
  }

  function buyAutomation(index) {
    const data = automationData[index];
    if (!data.unlock(state)) return;
    const cost = calculateAutomationCost(index);
    if (!canAfford(cost, data.costResource)) return;
    spend(cost, data.costResource);
    state.automations[index] += 1;
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
    logMessage(`+1 ${data.name}`, 'rare');
  }

  function createResearchCards() {
    researchGrid.innerHTML = '';
    researchData.forEach((data, index) => {
      const fragment = researchTemplate.content.cloneNode(true);
      const card = fragment.querySelector('.card');
      const title = fragment.querySelector('.card-title');
      const status = fragment.querySelector('.card-status');
      const desc = fragment.querySelector('.card-desc');
      const effect = fragment.querySelector('.card-effect');
      const cost = fragment.querySelector('.card-cost');
      const button = fragment.querySelector('.card-action');
      title.textContent = data.name;
      button.addEventListener('click', () => buyResearch(index));
      researchGrid.appendChild(fragment);
      researchCards[index] = { root: card, status, desc, effect, cost, button };
    });
  }

  function buyResearch(index) {
    const data = researchData[index];
    if (state.researchCompleted[data.key]) return;
    if (!data.unlock(state)) return;
    if (!Object.entries(data.cost).every(([resource, cost]) => canAfford(cost, resource))) return;
    Object.entries(data.cost).forEach(([resource, cost]) => spend(cost, resource));
    state.researchCompleted[data.key] = true;
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
    logMessage(`Recherche « ${data.name} » intégrée.`, 'legendary');
  }

  function createAchievementEntries() {
    achievementList.innerHTML = '';
    achievementData.forEach((data, index) => {
      const fragment = achievementTemplate.content.cloneNode(true);
      const entry = fragment.querySelector('.timeline-entry');
      const title = fragment.querySelector('.timeline-title');
      const text = fragment.querySelector('.timeline-text');
      title.textContent = data.name;
      text.textContent = data.description;
      achievementList.appendChild(fragment);
      achievementCards[index] = { root: entry };
    });
  }

  function checkAchievements() {
    achievementData.forEach((achievement) => {
      if (state.achievementsUnlocked.includes(achievement.key)) return;
      if (achievement.check(state)) {
        state.achievementsUnlocked.push(achievement.key);
        logMessage(`Succès : ${achievement.name}`, 'mythic');
        uiNeedsRefresh = true;
      }
    });
  }

  function pullArtifacts(count) {
    if (count <= 0) return;
    if (state.tokens < count) {
      logMessage('Pas assez de clés.', 'common');
      return;
    }
    state.tokens -= count;
    state.stats.summons += count;
    const pulls = [];
    for (let i = 0; i < count; i += 1) {
      pulls.push(generateArtifact());
    }
    displayGachaResults(pulls);
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
  }

  function generateArtifact() {
    if (needsBonusRecalc) recalcBonuses();
    const totalWeight = rarityData.reduce(
      (sum, rarity) => sum + rarity.weight * (1 + state.bonuses.gachaLuck * rarity.luckFactor),
      0,
    );
    let roll = Math.random() * totalWeight;
    let chosen = null;
    for (const rarity of rarityData) {
      const weight = rarity.weight * (1 + state.bonuses.gachaLuck * rarity.luckFactor);
      if (roll <= weight) {
        chosen = rarity;
        break;
      }
      roll -= weight;
    }
    if (!chosen) chosen = rarityData[rarityData.length - 1];
    const effect = artifactEffects[Math.floor(Math.random() * artifactEffects.length)];
    const [min, max] = chosen.valueRange;
    const value = (Math.random() * (max - min) + min) * chosen.luckFactor;
    const existing = state.artifacts.find((a) => a.effectKey === effect.key);
    if (existing) {
      existing.stacks += 1;
      state.duplicates[effect.key] = (state.duplicates[effect.key] || 0) + 1;
    } else {
      state.artifacts.push({ effectKey: effect.key, value, stacks: 1 });
    }
    logMessage(`Artéfact ${effect.name} (${chosen.name})`, chosen.key);
    return { rarity: chosen, effect, value };
  }

  function displayGachaResults(results) {
    gachaResults.innerHTML = '';
    results.forEach((result, idx) => {
      const card = document.createElement('div');
      card.className = `gacha-card ${result.rarity.key}`;
      card.style.animationDelay = `${idx * 0.05}s`;
      card.innerHTML = `
        <span class="rarity">${result.rarity.name}</span>
        <span class="name">${result.effect.name}</span>
        <span class="bonus">${result.effect.description(result.value)}</span>
      `;
      gachaResults.appendChild(card);
    });
  }

  function salvageDuplicates() {
    let converted = 0;
    Object.entries(state.duplicates).forEach(([key, count]) => {
      if (count > 0) {
        const shardGain = count * 5;
        state.shards += shardGain;
        converted += shardGain;
        state.duplicates[key] = 0;
      }
    });
    if (converted > 0) {
      logMessage(`Transmutation réussie · +${formatNumber(converted)} fragments`, 'rare');
      needsBonusRecalc = true;
      uiNeedsRefresh = true;
    } else {
      logMessage('Aucun doublon à transmuter.', 'common');
    }
  }

  function logMessage(message, rarity = 'common') {
    const entry = document.createElement('li');
    entry.textContent = message;
    entry.dataset.rarity = rarity;
    entry.style.color = getRarityColor(rarity);
    eventLog.prepend(entry);
    while (eventLog.children.length > 8) {
      eventLog.removeChild(eventLog.lastChild);
    }
  }

  function getRarityColor(key) {
    switch (key) {
      case 'uncommon':
        return '#72ffb6';
      case 'rare':
        return '#73bcff';
      case 'legendary':
        return '#ffd17c';
      case 'mythic':
        return '#ff7ce7';
      default:
        return '#9ba3c9';
    }
  }

  function saveState() {
    state.version = VERSION;
    state.lastSave = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    logMessage('Sauvegarde synchronisée.', 'uncommon');
  }

  function exportState() {
    saveDataArea.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    saveDataArea.focus();
    saveDataArea.select();
    logMessage('Sauvegarde exportée.', 'rare');
  }

  function importState() {
    try {
      const raw = decodeURIComponent(escape(atob(saveDataArea.value.trim())));
      const parsed = JSON.parse(raw);
      state = {
        ...defaultState(),
        ...parsed,
        bonuses: baselineBonuses(parsed.eternity || 0),
      };
      needsBonusRecalc = true;
      uiNeedsRefresh = true;
      logMessage('Sauvegarde importée.', 'legendary');
    } catch (err) {
      logMessage('Import impossible.', 'common');
    }
  }

  function wipeState() {
    if (!window.confirm('Réinitialiser la progression ?')) return;
    state = defaultState();
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
    logMessage('Nouvelle timeline engagée.', 'legendary');
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state = {
        ...defaultState(),
        ...parsed,
      };
      const now = Date.now();
      const lastUpdate = parsed.lastUpdate || now;
      const delta = Math.max(0, now - lastUpdate);
      state.lastUpdate = now;
      state.lastSave = parsed.lastSave || now;
      needsBonusRecalc = true;
      if (delta > TICK_MS) {
        const offlineDelta = Math.min(delta, MAX_OFFLINE_MS * (state.bonuses.offline || 1));
        processResources(offlineDelta);
        logMessage(`Progression hors-ligne : ${formatDuration(offlineDelta)}.`, 'uncommon');
      }
      if (!state.version || state.version !== VERSION) {
        state.version = VERSION;
      }
      uiNeedsRefresh = true;
      logMessage('Nexus restauré.', 'uncommon');
    } catch (err) {
      console.error('Chargement impossible', err);
    }
  }

  function visualPulse(element) {
    element.classList.remove('active-pulse');
    void element.offsetWidth;
    element.classList.add('active-pulse');
    setTimeout(() => element.classList.remove('active-pulse'), 400);
  }

  function setupTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    const panels = document.querySelectorAll('.tab-panel');
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        buttons.forEach((b) => b.classList.toggle('active', b === button));
        panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tab === tab));
      });
    });
  }

  function animateStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const stars = new Array(120).fill(null).map(() => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.4 + 0.4,
      speed: Math.random() * 0.0002 + 0.00005,
    }));

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    function step(now) {
      const delta = now - last;
      last = now;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((star) => {
        star.y += star.speed * delta;
        if (star.y > 1) {
          star.y = 0;
          star.x = Math.random();
        }
        const x = star.x * canvas.width;
        const y = star.y * canvas.height;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.size * 4);
        gradient.addColorStop(0, 'rgba(90, 240, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(90, 240, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, star.size * 2, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function gameLoop(now) {
    const delta = now - state.lastUpdate;
    state.lastUpdate = now;
    processResources(delta);
    checkAchievements();
    updateUI(now);
    if (now - state.lastSave >= AUTO_SAVE_MS) {
      saveState();
    }
    requestAnimationFrame(gameLoop);
  }

  function setupEventListeners() {
    gatherButton.addEventListener('click', gatherFlux);
    pullOnceButton.addEventListener('click', () => pullArtifacts(1));
    pullTenButton.addEventListener('click', () => pullArtifacts(10));
    salvageButton.addEventListener('click', salvageDuplicates);
    ascendButton.addEventListener('click', performAscension);
    exportButton.addEventListener('click', exportState);
    importButton.addEventListener('click', importState);
    wipeButton.addEventListener('click', wipeState);
  }

  function init() {
    versionSpan.textContent = VERSION;
    createAutomationCards();
    createResearchCards();
    createAchievementEntries();
    setupTabs();
    setupEventListeners();
    loadState();
    animateStarfield();
    state.lastUpdate = performance.now();
    state.lastSave = Date.now();
    requestAnimationFrame(gameLoop);
  }

  init();
})();

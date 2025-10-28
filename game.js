(() => {
  const VERSION = '1.0.0';
  const SAVE_KEY = 'chronoforge-idle-save';
  const TICK_MS = 200;
  const AUTO_SAVE_MS = 30000;
  const MAX_OFFLINE_MS = 1000 * 60 * 60 * 12; // 12 heures de progression hors ligne de base

  const automationData = [
    {
      key: 'drones',
      name: 'Drones focaliseurs',
      description: 'Des drones récupèrent passivement le flux ambiant.',
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
      description: 'Stabilise les visions pour obtenir des fragments de temps.',
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
      description: 'Alimente toutes les autres automations (+5%/niveau).',
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
      description: 'Optimise les invocations pour produire plus de clés.',
      effect: '+50% de production de clés',
      cost: { insight: 1350, shards: 18 },
      unlock: (state) => Boolean(state.researchCompleted.rift_studies),
    },
    {
      key: 'eternal_computation',
      name: 'Calcul éternel',
      description: 'Déverrouille les moteurs de paradoxe et augmente les fragments.',
      effect: 'Débloque les moteurs +25% fragments',
      cost: { insight: 3200, shards: 85 },
      unlock: (state) => Boolean(state.researchCompleted.void_beacons),
    },
    {
      key: 'time_dilation',
      name: 'Dilatation du temps',
      description: 'Amplifie la progression hors-ligne et la conversion d\'essence.',
      effect: '+50% progression hors-ligne et +25% essence',
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
      name: 'Balise d'appel',
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
      name: 'Voyageur du néant',
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

  let state = defaultState();
  let needsBonusRecalc = true;
  let uiNeedsRefresh = true;
  let lastUiUpdate = 0;

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

  function formatNumber(value) {
    if (value >= 1e12) return (value / 1e12).toFixed(2) + 't';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'g';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'm';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'k';
    if (value === 0) return '0';
    if (value < 0.01) return value.toFixed(4);
    return value.toFixed(2);
  }

  function addToRate(resource, amount, seconds) {
    const acc = state.rateAccumulator[resource];
    if (!acc) return;
    acc.sum += amount;
    acc.time += seconds;
    if (acc.time >= 0.5) {
      state.rates[resource] = acc.sum / Math.max(acc.time, 0.0001);
      acc.sum = 0;
      acc.time = 0;
      uiNeedsRefresh = true;
    }
  }

  function calculateAutomationCost(index) {
    const data = automationData[index];
    const level = state.automations[index];
    const base = data.baseCost * Math.pow(data.costMult, level);
    return base;
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

    // Artéfacts
    state.artifacts.forEach((artifact) => {
      const effect = artifactEffects.find((e) => e.key === artifact.effectKey);
      if (effect) {
        effect.apply(bonuses, artifact.value * artifact.stacks);
      }
    });

    // Automations passives
    const paradoxIndex = automationData.findIndex((a) => a.key === 'paradox');
    if (paradoxIndex >= 0) {
      const paradoxLevel = state.automations[paradoxIndex];
      if (paradoxLevel > 0) {
        bonuses.automation *= 1 + paradoxLevel * 0.05;
      }
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
        const resourceMultiplier = (state.bonuses[resource] || 1);
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
    if (deltaMs > TICK_MS * 2) {
      state.stats.offlineMs += deltaMs;
    }
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
      card.level.textContent = `Niveau ${level}`;
      card.description.textContent = data.description;
      card.effect.textContent = Object.entries(data.baseProduction)
        .map(([resource, value]) => `${formatNumber(value)} ${resource}/s`)
        .join(' + ') || 'Boost passif';
      card.cost.textContent = `Coût : ${formatNumber(cost)} ${data.costResource}`;
      card.button.textContent = unlocked ? 'Acheter' : 'Verrouillé';
      card.button.disabled = !unlocked || !canAfford(cost, data.costResource);
    });
  }

  function updateResearchUI() {
    researchCards.forEach((card, index) => {
      const data = researchData[index];
      const completed = Boolean(state.researchCompleted[data.key]);
      const affordable = Object.entries(data.cost).every(([resource, cost]) => canAfford(cost, resource));
      const unlocked = data.unlock(state);
      card.root.classList.toggle('locked', !unlocked || completed);
      card.status.textContent = completed ? 'Complété' : unlocked ? 'Disponible' : 'Verrouillé';
      card.description.textContent = data.description;
      card.effect.textContent = data.effect;
      card.cost.textContent = 'Coût : ' +
        Object.entries(data.cost)
          .map(([resource, cost]) => `${formatNumber(cost)} ${resource}`)
          .join(' + ');
      card.button.textContent = completed ? 'Terminé' : 'Étudier';
      card.button.disabled = completed || !unlocked || !affordable;
    });
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
    if (!state.artifacts.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Aucun artéfact encore. Le Néant attend.';
      empty.style.color = 'var(--text-dim)';
      artifactInventory.appendChild(empty);
      return;
    }
    const sorted = [...state.artifacts].sort((a, b) => rarityOrder(a.rarity) - rarityOrder(b.rarity));
    sorted.forEach((artifact) => {
      const card = document.createElement('article');
      card.classList.add('card', 'artifact-card');
      const title = document.createElement('h4');
      title.classList.add('title');
      title.textContent = artifact.name;
      const rarity = document.createElement('span');
      rarity.classList.add('rarity', `rarity-${artifact.rarity}`);
      rarity.textContent = `${capitalize(artifact.rarity)} • x${artifact.stacks}`;
      const bonus = document.createElement('p');
      bonus.classList.add('bonus');
      const effect = artifactEffects.find((e) => e.key === artifact.effectKey);
      bonus.textContent = effect ? effect.description(artifact.value * artifact.stacks) : artifact.description;
      card.appendChild(title);
      card.appendChild(rarity);
      card.appendChild(bonus);
      artifactInventory.appendChild(card);
    });
  }

  function rarityOrder(key) {
    return rarityData.findIndex((r) => r.key === key);
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function updateResourcesUI() {
    fluxCount.textContent = formatNumber(state.flux);
    insightCount.textContent = formatNumber(state.insight);
    shardsCount.textContent = formatNumber(state.shards);
    tokensCount.textContent = formatNumber(state.tokens);
    eternityCount.textContent = formatNumber(state.eternity);
    fluxRate.textContent = `+${formatNumber(state.rates.flux)} /s`;
    insightRate.textContent = `+${formatNumber(state.rates.insight)} /s`;
    shardsRate.textContent = `+${formatNumber(state.rates.shards)} /s`;
    tokensRate.textContent = `+${formatNumber(state.rates.tokens)} /s`;
    eternityMult.textContent = `${state.bonuses.global.toFixed(2)}x`;
    ascendCount.textContent = state.ascensions;
    ascendButton.disabled = !canAscend();
  }

  function updateUI(now) {
    if (needsBonusRecalc) recalcBonuses();
    if (now - lastUiUpdate < 250 && !uiNeedsRefresh) return;
    lastUiUpdate = now;
    uiNeedsRefresh = false;
    updateResourcesUI();
    updateAutomationsUI();
    updateResearchUI();
    updateAchievementsUI();
    updateArtifactInventory();
  }

  function canAscend() {
    return state.stats.fluxLifetime >= 100_000 && state.flux >= 1000;
  }

  function performAscension() {
    if (!canAscend()) return;
    if (needsBonusRecalc) recalcBonuses();
    const essenceBase = Math.max(1, Math.floor(Math.pow(state.stats.fluxLifetime / 100_000, 0.6)));
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
    logMessage(`Ascension effectuée ! Essence +${essenceGain}.`, 'legendary');
  }

  function createAutomationCards() {
    const template = document.querySelector('#automation-card-template');
    const list = document.querySelector('#automation-list');
    automationData.forEach((data, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.card');
      const title = fragment.querySelector('.title');
      const level = fragment.querySelector('.level');
      const description = fragment.querySelector('.description');
      const effect = fragment.querySelector('.effect');
      const cost = fragment.querySelector('.cost');
      const button = fragment.querySelector('.buy-button');
      title.textContent = data.name;
      button.addEventListener('click', () => buyAutomation(index));
      list.appendChild(fragment);
      automationCards[index] = { root: card, level, description, effect, cost, button };
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
  }

  function createResearchCards() {
    const template = document.querySelector('#research-card-template');
    const list = document.querySelector('#research-list');
    researchData.forEach((data, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.card');
      const title = fragment.querySelector('.title');
      const status = fragment.querySelector('.status');
      const description = fragment.querySelector('.description');
      const effect = fragment.querySelector('.effect');
      const cost = fragment.querySelector('.cost');
      const button = fragment.querySelector('.buy-button');
      title.textContent = data.name;
      button.addEventListener('click', () => buyResearch(index));
      list.appendChild(fragment);
      researchCards[index] = { root: card, status, description, effect, cost, button };
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
  }

  function createAchievementCards() {
    const template = document.querySelector('#achievement-template');
    const list = document.querySelector('#achievement-list');
    achievementData.forEach((data, index) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.card');
      const title = fragment.querySelector('.title');
      const description = fragment.querySelector('.description');
      title.textContent = data.name;
      description.textContent = data.description;
      list.appendChild(fragment);
      achievementCards[index] = { root: card };
    });
  }

  function checkAchievements() {
    achievementData.forEach((achievement) => {
      if (state.achievementsUnlocked.includes(achievement.key)) return;
      if (achievement.check(state)) {
        state.achievementsUnlocked.push(achievement.key);
        uiNeedsRefresh = true;
        logMessage(`Succès : ${achievement.name}`, 'rare');
      }
    });
  }

  function weightedRandomRarity() {
    if (needsBonusRecalc) recalcBonuses();
    const luck = state.bonuses.gachaLuck;
    const weights = rarityData.map((rarity) => rarity.weight * Math.pow(rarity.luckFactor, luck));
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) {
        return rarityData[i];
      }
    }
    return rarityData[0];
  }

  function randomArtifactEffect() {
    return artifactEffects[Math.floor(Math.random() * artifactEffects.length)];
  }

  function summon(count) {
    if (!Number.isInteger(count) || count <= 0) return;
    if (state.tokens < count) {
      logMessage('Pas assez de clés.', 'common');
      return;
    }
    state.tokens -= count;
    const pulls = [];
    for (let i = 0; i < count; i += 1) {
      const rarity = weightedRandomRarity();
      const effect = randomArtifactEffect();
      const value = randomInRange(...rarity.valueRange) * (1 + state.ascensions * 0.05);
      const artifactId = `${effect.key}`;
      let artifact = state.artifacts.find((a) => a.effectKey === artifactId);
      const description = effect.description(value);
      if (artifact) {
        state.duplicates[artifactId] = (state.duplicates[artifactId] || 0) + 1;
        artifact.stacks += 1;
        artifact.value = (artifact.value + value) / 2;
        artifact.description = effect.description(artifact.value);
        logMessage(`Doublon transmuté : ${artifact.name}`, rarity.key);
      } else {
        artifact = {
          id: `${artifactId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          effectKey: artifactId,
          name: `${effect.name}`,
          description,
          rarity: rarity.key,
          value,
          stacks: 1,
        };
        state.artifacts.push(artifact);
        logMessage(`Artéfact ${rarity.name} : ${artifact.name}`, rarity.key);
      }
      pulls.push({ rarity: rarity.key, name: effect.name });
    }
    state.stats.summons += count;
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
    renderGachaSummary(pulls);
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function logMessage(message, rarity = 'common') {
    const entry = document.createElement('div');
    entry.classList.add('entry', rarity);
    entry.textContent = message;
    gachaLog.prepend(entry);
    while (gachaLog.children.length > 50) {
      gachaLog.removeChild(gachaLog.lastChild);
    }
  }

  function renderGachaSummary(pulls) {
    const summary = pulls
      .reduce((acc, pull) => {
        acc[pull.rarity] = (acc[pull.rarity] || 0) + 1;
        return acc;
      }, {});
    const summaryText = Object.entries(summary)
      .map(([rarity, amount]) => `${amount} ${capitalize(rarity)}`)
      .join(', ');
    logMessage(`Résultat : ${summaryText}`, pulls.some((p) => p.rarity === 'legendary' || p.rarity === 'mythic') ? 'legendary' : 'common');
  }

  function salvageDuplicates() {
    if (needsBonusRecalc) recalcBonuses();
    let total = 0;
    Object.entries(state.duplicates).forEach(([id, count]) => {
      if (count <= 0) return;
      total += count;
      state.duplicates[id] = 0;
    });
    if (!total) {
      logMessage('Aucun doublon à transmuter.', 'common');
      return;
    }
    const shardGain = total * 18 * (state.bonuses.shards || 1);
    state.shards += shardGain;
    state.stats.shardsLifetime += shardGain;
    addToRate('shards', shardGain, 1);
    logMessage(`Transmutation réussie : +${formatNumber(shardGain)} fragments`, 'rare');
    uiNeedsRefresh = true;
  }

  function saveGame() {
    try {
      state.lastSave = Date.now();
      const save = JSON.stringify(state);
      localStorage.setItem(SAVE_KEY, btoa(save));
    } catch (error) {
      console.warn('Sauvegarde impossible', error);
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(atob(raw));
      state = { ...defaultState(), ...parsed };
      // réhydrate les structures imbriquées
      state.automations = automationData.map((_, index) => Number(parsed.automations ? parsed.automations[index] || 0 : 0));
      state.researchCompleted = parsed.researchCompleted || {};
      state.artifacts = (parsed.artifacts || []).map((artifact) => ({
        ...artifact,
        stacks: artifact.stacks || 1,
        value: typeof artifact.value === 'number' ? artifact.value : Number(artifact.value) || 0,
        rarity: artifact.rarity || 'common',
        effectKey: artifact.effectKey || 'flux',
      }));
      state.duplicates = parsed.duplicates || {};
      state.achievementsUnlocked = parsed.achievementsUnlocked || [];
      state.stats = { ...defaultState().stats, ...parsed.stats };
      state.rateAccumulator = defaultState().rateAccumulator;
      state.rates = defaultState().rates;
      state.lastUpdate = parsed.lastUpdate || Date.now();
      state.bonuses = baselineBonuses(state.eternity);
      needsBonusRecalc = true;
    } catch (error) {
      console.warn('Chargement impossible', error);
      state = defaultState();
    }
  }

  function wipeSave() {
    if (!confirm('Effacer définitivement la sauvegarde ?')) return;
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    needsBonusRecalc = true;
    uiNeedsRefresh = true;
    logMessage('Nouvelle ligne temporelle créée.', 'common');
  }

  function exportSave() {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) {
        saveDataField.value = '';
        return;
      }
      saveDataField.value = data;
      saveDataField.select();
      document.execCommand('copy');
    } catch (error) {
      console.warn('Export impossible', error);
    }
  }

  function importSave() {
    try {
      const raw = saveDataField.value.trim();
      if (!raw) return;
      localStorage.setItem(SAVE_KEY, raw);
      loadGame();
      needsBonusRecalc = true;
      uiNeedsRefresh = true;
      logMessage('Sauvegarde importée.', 'common');
    } catch (error) {
      console.warn('Import impossible', error);
    }
  }

  function gameLoop() {
    const now = Date.now();
    const delta = now - state.lastUpdate;
    if (delta > 0) {
      processResources(delta);
    }
    state.lastUpdate = now;
    checkAchievements();
    updateUI(now);
    requestAnimationFrame(gameLoop);
  }

  function init() {
    versionLabel.textContent = VERSION;
    loadGame();
    createAutomationCards();
    createResearchCards();
    createAchievementCards();
    updateArtifactInventory();
    updateUI(Date.now());
    window.addEventListener('beforeunload', saveGame);
    setInterval(saveGame, AUTO_SAVE_MS);
    requestAnimationFrame(gameLoop);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveGame();
    }
  });

  // DOM references
  const fluxCount = document.querySelector('#flux-count');
  const insightCount = document.querySelector('#insight-count');
  const shardsCount = document.querySelector('#shards-count');
  const tokensCount = document.querySelector('#tokens-count');
  const eternityCount = document.querySelector('#eternity-count');
  const fluxRate = document.querySelector('#flux-rate');
  const insightRate = document.querySelector('#insight-rate');
  const shardsRate = document.querySelector('#shards-rate');
  const tokensRate = document.querySelector('#tokens-rate');
  const eternityMult = document.querySelector('#eternity-mult');
  const gatherButton = document.querySelector('#gather-button');
  const pullOnceButton = document.querySelector('#pull-once');
  const pullTenButton = document.querySelector('#pull-ten');
  const salvageButton = document.querySelector('#salvage-duplicates');
  const gachaLog = document.querySelector('#gacha-log');
  const artifactInventory = document.querySelector('#artifact-inventory');
  const versionLabel = document.querySelector('#version');
  const exportButton = document.querySelector('#export-save');
  const importButton = document.querySelector('#import-save');
  const wipeButton = document.querySelector('#wipe-save');
  const saveDataField = document.querySelector('#save-data');
  const ascendButton = document.querySelector('#ascend-button');
  const ascendCount = document.querySelector('#ascend-count');

  const automationCards = [];
  const researchCards = [];
  const achievementCards = [];

  gatherButton.addEventListener('click', gatherFlux);
  pullOnceButton.addEventListener('click', () => summon(1));
  pullTenButton.addEventListener('click', () => summon(10));
  salvageButton.addEventListener('click', salvageDuplicates);
  exportButton.addEventListener('click', exportSave);
  importButton.addEventListener('click', importSave);
  wipeButton.addEventListener('click', wipeSave);
  ascendButton.addEventListener('click', performAscension);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

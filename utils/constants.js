const TIER_POINTS = { HT1: 60, HT2: 45, HT3: 30, LT1: 20, LT2: 10, LT3: 5 };
const TIER_EMOJI = { HT1: '🥇', HT2: '🥈', HT3: '🥉', LT1: '🟣', LT2: '🔵', LT3: '🟢' };
const BADGE_THRESHOLDS = [
  { min: 180, badge: 'combat_grandmaster', label: 'Combat Grandmaster', emoji: '👑' },
  { min: 90,  badge: 'combat_master',      label: 'Combat Master',      emoji: '⭐' },
  { min: 30,  badge: 'combat_ace',         label: 'Combat Ace',         emoji: '💎' },
  { min: 0,   badge: 'rookie',             label: 'Rookie',             emoji: '🌱' },
];
const REGION_EMOJI = { ID: '🇮🇩', US: '🇺🇸', EU: '🇪🇺', AS: '🌏', SA: '🌎', OC: '🌏', UK: '🇬🇧', SG: '🇸🇬', MY: '🇲🇾', JP: '🇯🇵' };

// Premium Embed Colors
const EMBED_COLORS = {
  SUCCESS: 0x22c55e, // Green
  PRIMARY: 0x3b82f6, // Modern Blue
  ERROR: 0xef4444,   // Red
  WARNING: 0xf59e0b, // Yellow
  INFO: 0x60a5fa     // Light Blue
};

module.exports = {
  TIER_POINTS,
  TIER_EMOJI,
  BADGE_THRESHOLDS,
  REGION_EMOJI,
  EMBED_COLORS
};

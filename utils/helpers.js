const axios = require('axios');
const supabase = require('./supabase');
const { BADGE_THRESHOLDS, TIER_POINTS } = require('./constants');

function getBadge(totalPoints) {
  return BADGE_THRESHOLDS.find(b => totalPoints >= b.min) || BADGE_THRESHOLDS[BADGE_THRESHOLDS.length - 1];
}

async function getUUID(username) {
  try {
    const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    return res.data.id;
  } catch (e) { 
    return null; 
  }
}

async function recalcPlayer(playerId) {
  const { data: tiers } = await supabase.from('player_tiers').select('tier').eq('player_id', playerId);
  const totalPoints = (tiers || []).reduce((sum, t) => sum + (TIER_POINTS[t.tier] || 0), 0);
  const badge = getBadge(totalPoints);
  
  await supabase.from('players').update({
    total_points: totalPoints,
    badge: badge.badge,
    updated_at: new Date().toISOString()
  }).eq('id', playerId);
  
  return { totalPoints, badge };
}

module.exports = {
  getBadge,
  getUUID,
  recalcPlayer
};

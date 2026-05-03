const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { getBadge } = require('../utils/helpers');
const { TIER_EMOJI, EMBED_COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rankings')
    .setDescription('Lihat top 10 pemain')
    .addStringOption(o => o.setName('category').setDescription('Pilih Kategori').setRequired(true)
      .addChoices(
        { name: '🏆 Overall', value: 'overall' },
        { name: '⚔️ Sword', value: 'sword' }, { name: '🛡️ SMP', value: 'smp' },
        { name: '🔨 Mace', value: 'mace' }, { name: '🧪 Pot', value: 'pot' },
        { name: '🟢 Vanilla', value: 'vanilla' }, { name: '💎 NethOP', value: 'nethop' },
        { name: '🪓 Axe', value: 'axe' }, { name: '❤️ UHC', value: 'uhc' }
      )),
  
  async execute(interaction) {
    const categorySlug = interaction.options.getString('category');
    const embed = new EmbedBuilder().setColor(EMBED_COLORS.PRIMARY).setTimestamp().setFooter({ text: 'BrutalMC Tier System' });

    if (categorySlug === 'overall') {
      embed.setTitle('🏆 TOP 10 OVERALL RANKINGS');
      const { data } = await supabase.from('players').select('username, total_points, mc_uuid').order('total_points', { ascending: false }).limit(10);
      
      if (!data || data.length === 0) {
        embed.setDescription('*No data available.*');
      } else {
        const lines = data.map((p, i) => {
          const badge = getBadge(p.total_points);
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i+1}.**`;
          return `${medal} **${p.username}** — ${badge.emoji} **${p.total_points} PTS**`;
        });
        embed.setDescription(lines.join('\n\n'));
      }
    } else {
      const { data: cat } = await supabase.from('categories').select('id, name').eq('slug', categorySlug).single();
      
      if (!cat) {
        return interaction.editReply({ content: '❌ Kategori tidak ditemukan.' });
      }

      embed.setTitle(`📂 TOP 10: ${cat.name.toUpperCase()}`);
      
      const { data } = await supabase.from('player_tiers')
        .select('tier, players(username, total_points, mc_uuid)')
        .eq('category_id', cat.id)
        .limit(10); // Note: We might want to order by tier value eventually

      if (!data || data.length === 0) {
        embed.setDescription('*No data available for this category.*');
      } else {
        // Basic sort by tier value locally if needed, but for now we display as retrieved
        const lines = data.map((t, i) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i+1}.**`;
          return `${medal} **${t.players?.username}** — ${TIER_EMOJI[t.tier]} **${t.tier}**`;
        });
        embed.setDescription(lines.join('\n\n'));
      }
    }
    
    await interaction.editReply({ embeds: [embed] });
  }
};

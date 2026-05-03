const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { getBadge } = require('../utils/helpers');
const { TIER_EMOJI, EMBED_COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Lihat profil pemain')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true)),
  
  async execute(interaction) {
    const username = interaction.options.getString('username');
    const { data: p } = await supabase.from('players').select('*, player_tiers(tier, categories(slug, name))').eq('username', username).single();
    
    if (!p) {
        return await interaction.editReply({ content: '❌ Player tidak ditemukan di database.' });
    }

    const badge = getBadge(p.total_points);
    const uuid = p.mc_uuid || username;
    const tierLines = p.player_tiers?.map(t => `${TIER_EMOJI[t.tier]} **${t.categories?.name}** → **${t.tier}**`) || [];

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Profile: ${p.username}`, iconURL: `https://mc-heads.net/avatar/${uuid}/64` })
      .setColor(EMBED_COLORS.INFO)
      .setThumbnail(`https://mc-heads.net/avatar/${uuid}/256`)
      .setImage(`https://mc-heads.net/body/${uuid}/right`)
      .addFields(
        { name: '🏆 Rank', value: `${badge.emoji} **${badge.label}**`, inline: true },
        { name: '⭐ Points', value: `**${p.total_points}**`, inline: true },
        { name: '🌐 Discord', value: p.discord_id ? `<@${p.discord_id}>` : '*Not Linked*', inline: true },
        { name: '📂 Tiers', value: tierLines.length > 0 ? tierLines.join('\n') : '*Belum memiliki tier*' }
      )
      .setFooter({ text: 'BrutalMC Tier System' })
      .setTimestamp();
      
    await interaction.editReply({ embeds: [embed] });
  }
};

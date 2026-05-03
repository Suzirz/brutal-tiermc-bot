const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { recalcPlayer } = require('../utils/helpers');
const { EMBED_COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removetier')
    .setDescription('Hapus tier pemain dari kategori tertentu')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true))
    .addStringOption(o => o.setName('category').setDescription('Kategori yang ingin dihapus').setRequired(true)
      .addChoices(
        { name: 'Sword', value: 'sword' }, { name: 'SMP', value: 'smp' },
        { name: 'Mace', value: 'mace' }, { name: 'Pot', value: 'pot' },
        { name: 'Vanilla', value: 'vanilla' }, { name: 'NethOP', value: 'nethop' },
        { name: 'Axe', value: 'axe' }, { name: 'UHC', value: 'uhc' }
      )),
  
  async execute(interaction) {
    const username = interaction.options.getString('username');
    const categorySlug = interaction.options.getString('category');
    
    const { data: p } = await supabase.from('players').select('id, mc_uuid').eq('username', username).single();
    const { data: c } = await supabase.from('categories').select('id, name').eq('slug', categorySlug).single();
    
    if (p && c) {
      const { error } = await supabase.from('player_tiers').delete().eq('player_id', p.id).eq('category_id', c.id);
      
      if (error) {
        return interaction.editReply({ content: '❌ Terjadi kesalahan saat menghapus tier dari database.' });
      }

      const { totalPoints } = await recalcPlayer(p.id);
      
      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Tier Removed', iconURL: interaction.user.displayAvatarURL() })
        .setColor(EMBED_COLORS.WARNING)
        .setThumbnail(`https://mc-heads.net/avatar/${p.mc_uuid || username}/256`)
        .setDescription(`Tier untuk **${username}** di kategori **${c.name || categorySlug}** telah dihapus.`)
        .addFields({ name: '🏆 Total Points Now', value: `**${totalPoints}** PTS`, inline: true })
        .setFooter({ text: 'BrutalMC Tier System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ content: '❌ Player atau Kategori tidak ditemukan di database.' });
    }
  }
};

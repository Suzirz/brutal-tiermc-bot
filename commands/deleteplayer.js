const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { EMBED_COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deleteplayer')
    .setDescription('Hapus pemain dari database secara permanen')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true)),
  
  async execute(interaction) {
    const username = interaction.options.getString('username');
    const { data: p } = await supabase.from('players').select('id, mc_uuid').eq('username', username).single();
    
    if (p) {
      await supabase.from('player_tiers').delete().eq('player_id', p.id);
      const { error } = await supabase.from('players').delete().eq('id', p.id);
      
      if (error) {
         return interaction.editReply({ content: '❌ Terjadi kesalahan saat menghapus pemain.' });
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: 'Player Deleted', iconURL: interaction.user.displayAvatarURL() })
        .setColor(EMBED_COLORS.ERROR)
        .setThumbnail(`https://mc-heads.net/avatar/${p.mc_uuid || username}/256`)
        .setDescription(`Seluruh data untuk pemain **${username}** telah dihapus secara permanen dari database.`)
        .setFooter({ text: 'BrutalMC Tier System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ content: '❌ Player tidak ditemukan di database.' });
    }
  }
};

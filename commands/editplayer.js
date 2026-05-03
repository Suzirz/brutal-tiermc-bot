const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { getUUID } = require('../utils/helpers');
const { REGION_EMOJI, EMBED_COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editplayer')
    .setDescription('Update profil pemain tanpa mengubah tier')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true))
    .addUserOption(o => o.setName('user').setDescription('Update Discord Account').setRequired(false))
    .addStringOption(o => o.setName('location').setDescription('Update Region').setRequired(false)
      .addChoices(
        { name: '🇮🇩 Indonesia', value: 'ID' }, { name: '🇺🇸 North America', value: 'US' },
        { name: '🇪🇺 Europe', value: 'EU' }, { name: '🌏 Asia', value: 'AS' },
        { name: '🌎 South America', value: 'SA' }, { name: '🌏 Oceania', value: 'OC' }
      ))
    .addStringOption(o => o.setName('skin').setDescription('Update Skin URL').setRequired(false)),
  
  async execute(interaction) {
    const username = interaction.options.getString('username');
    const discordUser = interaction.options.getUser('user');
    const country_code = interaction.options.getString('location');
    const skin_url = interaction.options.getString('skin');

    if (!discordUser && !country_code && !skin_url) {
      return interaction.editReply({ content: '⚠️ Kamu harus memberikan setidaknya satu opsi untuk di-update (user, location, atau skin).' });
    }

    const { data: p, error: getErr } = await supabase.from('players').select('*').eq('username', username).single();
    
    if (getErr || !p) {
      return interaction.editReply({ content: `❌ Pemain dengan username **${username}** tidak ditemukan di database.` });
    }

    const updates = {};
    const changes = [];
    
    if (discordUser) {
      updates.discord_id = discordUser.id;
      changes.push(`**Discord:** <@${discordUser.id}>`);
    }
    if (country_code) {
      updates.country_code = country_code;
      changes.push(`**Region:** ${REGION_EMOJI[country_code] || ''} ${country_code}`);
    }
    if (skin_url) {
      updates.skin_url = skin_url;
      changes.push(`**Skin URL:** [Link](${skin_url})`);
    }

    // Always attempt to refetch UUID if username is passed
    const uuid = await getUUID(username) || p.mc_uuid;
    if (uuid && uuid !== p.mc_uuid) {
        updates.mc_uuid = uuid;
    }

    updates.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase.from('players').update(updates).eq('id', p.id);

    if (updateErr) {
      console.error(updateErr);
      return interaction.editReply({ content: '❌ Terjadi kesalahan saat mengupdate profil pemain.' });
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Player Profile Updated', iconURL: discordUser ? discordUser.displayAvatarURL() : interaction.user.displayAvatarURL() })
      .setColor(EMBED_COLORS.PRIMARY)
      .setThumbnail(`https://mc-heads.net/avatar/${uuid || username}/256`)
      .setDescription(`Profil untuk **${username}** berhasil diupdate.\n\n**Perubahan yang dilakukan:**\n${changes.map(c => `• ${c}`).join('\n')}`)
      .setFooter({ text: 'BrutalMC Tier System' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

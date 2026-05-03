const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const { getUUID, recalcPlayer } = require('../utils/helpers');
const { TIER_EMOJI, REGION_EMOJI, EMBED_COLORS } = require('../utils/constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addtier')
    .setDescription('Tambah atau Update pemain ke Tier List')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true))
    .addUserOption(o => o.setName('user').setDescription('Akun Discord player').setRequired(true))
    .addStringOption(o => o.setName('tier').setDescription('Tier').setRequired(true)
      .addChoices(
        { name: 'HT1 - High Tier 1', value: 'HT1' }, { name: 'HT2 - High Tier 2', value: 'HT2' },
        { name: 'HT3 - High Tier 3', value: 'HT3' }, { name: 'LT1 - Low Tier 1', value: 'LT1' },
        { name: 'LT2 - Low Tier 2', value: 'LT2' }, { name: 'LT3 - Low Tier 3', value: 'LT3' }
      ))
    .addStringOption(o => o.setName('category').setDescription('Kategori').setRequired(true)
      .addChoices(
        { name: 'Sword', value: 'sword' }, { name: 'SMP', value: 'smp' },
        { name: 'Mace', value: 'mace' }, { name: 'Pot', value: 'pot' },
        { name: 'Vanilla', value: 'vanilla' }, { name: 'NethOP', value: 'nethop' },
        { name: 'Axe', value: 'axe' }, { name: 'UHC', value: 'uhc' }
      ))
    .addStringOption(o => o.setName('location').setDescription('Region').setRequired(true)
      .addChoices(
        { name: '🇮🇩 Indonesia', value: 'ID' }, { name: '🇺🇸 North America', value: 'US' },
        { name: '🇪🇺 Europe', value: 'EU' }, { name: '🌏 Asia', value: 'AS' },
        { name: '🌎 South America', value: 'SA' }, { name: '🌏 Oceania', value: 'OC' }
      ))
    .addStringOption(o => o.setName('skin').setDescription('Skin URL (Opsional)').setRequired(false)),

  async execute(interaction) {
    const username = interaction.options.getString('username');
    const discordUser = interaction.options.getUser('user');
    const country_code = interaction.options.getString('location');
    const tier = interaction.options.getString('tier');
    const categorySlug = interaction.options.getString('category');
    const skin_url = interaction.options.getString('skin');

    const uuid = await getUUID(username);

    // Get Category first, error if missing
    const { data: c, error: catErr } = await supabase.from('categories').select('id, name').eq('slug', categorySlug).single();

    if (catErr || !c) {
      return interaction.editReply({ content: `❌ Kategori **${categorySlug}** tidak ditemukan di database.` });
    }

    // Upsert Player
    const { data: p, error: pErr } = await supabase.from('players').upsert({
      username,
      discord_id: discordUser.id,
      country_code,
      skin_url,
      mc_uuid: uuid
    }, { onConflict: 'username' }).select().single();

    if (pErr) {
      console.error(pErr);
      return interaction.editReply({ content: '❌ Gagal menyimpan data pemain ke database.' });
    }

    // Upsert Tier
    const { error: tErr } = await supabase.from('player_tiers').upsert({
      player_id: p.id,
      category_id: c.id,
      tier
    }, { onConflict: 'player_id,category_id' });

    if (tErr) {
      console.error(tErr);
      return interaction.editReply({ content: '❌ Gagal menyimpan data tier ke database.' });
    }

    const { totalPoints, badge } = await recalcPlayer(p.id);

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Tier List Updated', iconURL: discordUser.displayAvatarURL() })
      .setColor(EMBED_COLORS.SUCCESS)
      .setThumbnail(`https://mc-heads.net/avatar/${uuid || username}/256`)
      .setDescription(`Data tier untuk **${username}** telah berhasil diperbarui.`)
      .addFields(
        { name: '👤 Player', value: `\`${username}\`\n<@${discordUser.id}>`, inline: true },
        { name: '📂 Category', value: `**${c.name || categorySlug}**`, inline: true },
        { name: '🏅 Assigned Tier', value: `${TIER_EMOJI[tier] || ''} **${tier}**`, inline: true },

        { name: '🌍 Region', value: `${REGION_EMOJI[country_code] || ''} ${country_code}`, inline: true },
        { name: '🏆 Total Points', value: `**${totalPoints}** PTS`, inline: true },
        { name: '✨ Current Rank', value: `${badge.emoji} **${badge.label}**`, inline: true }
      )
      .setFooter({ text: 'BrutalMC Tier System', iconURL: interaction.client.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

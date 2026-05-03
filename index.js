const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, MessageFlags } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ─── Constants ───
const TIER_POINTS = { HT1: 60, HT2: 45, HT3: 30, LT1: 20, LT2: 10, LT3: 5 };
const TIER_EMOJI = { HT1: '🥇', HT2: '🥈', HT3: '🥉', LT1: '🟣', LT2: '🔵', LT3: '🟢' };
const BADGE_THRESHOLDS = [
  { min: 180, badge: 'combat_grandmaster', label: 'Combat Grandmaster', emoji: '👑' },
  { min: 90, badge: 'combat_master', label: 'Combat Master', emoji: '⭐' },
  { min: 30, badge: 'combat_ace', label: 'Combat Ace', emoji: '💎' },
  { min: 0, badge: 'rookie', label: 'Rookie', emoji: '🌱' },
];
const REGION_EMOJI = { ID: '🇮🇩', US: '🇺🇸', EU: '🇪🇺', AS: '🌏', SA: '🌎', OC: '🌏', UK: '🇬🇧', SG: '🇸🇬', MY: '🇲🇾', JP: '🇯🇵' };

function getBadge(totalPoints) {
  return BADGE_THRESHOLDS.find(b => totalPoints >= b.min);
}

async function getUUID(username) {
  try {
    const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    return res.data.id;
  } catch (e) { return null; }
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

const commands = [
  new SlashCommandBuilder()
    .setName('addtier')
    .setDescription('Tambah/Update pemain ke Tier List')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true))
    .addUserOption(o => o.setName('user').setDescription('Pilih akun Discord player').setRequired(true))
    .addStringOption(o => o.setName('tier').setDescription('Pilih Tier').setRequired(true)
      .addChoices(
        { name: 'HT1 - High Tier 1', value: 'HT1' }, { name: 'HT2 - High Tier 2', value: 'HT2' },
        { name: 'HT3 - High Tier 3', value: 'HT3' }, { name: 'LT1 - Low Tier 1', value: 'LT1' },
        { name: 'LT2 - Low Tier 2', value: 'LT2' }, { name: 'LT3 - Low Tier 3', value: 'LT3' }
      ))
    .addStringOption(o => o.setName('category').setDescription('Pilih Kategori').setRequired(true)
      .addChoices(
        { name: 'Sword', value: 'sword' }, { name: 'SMP', value: 'smp' },
        { name: 'Mace', value: 'mace' }, { name: 'Pot', value: 'pot' },
        { name: 'Vanilla', value: 'vanilla' }, { name: 'NethOP', value: 'nethop' },
        { name: 'Axe', value: 'axe' }, { name: 'UHC', value: 'uhc' }
      ))
    .addStringOption(o => o.setName('location').setDescription('Pilih Region').setRequired(true)
      .addChoices(
        { name: '🇮🇩 Indonesia', value: 'ID' }, { name: '🇺🇸 North America', value: 'US' },
        { name: '🇪🇺 Europe', value: 'EU' }, { name: '🌏 Asia', value: 'AS' },
        { name: '🌎 South America', value: 'SA' }, { name: '🌏 Oceania', value: 'OC' }
      ))
    .addStringOption(o => o.setName('skin').setDescription('Skin URL (Opsional)').setRequired(false)),
  new SlashCommandBuilder()
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
  new SlashCommandBuilder().setName('deleteplayer').setDescription('Hapus pemain dari database')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true)),
  new SlashCommandBuilder().setName('editplayer').setDescription('Update profil pemain')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true))
    .addUserOption(o => o.setName('user').setDescription('Update Discord Account').setRequired(false))
    .addStringOption(o => o.setName('location').setDescription('Update Region').setRequired(false)
      .addChoices(
        { name: '🇮🇩 Indonesia', value: 'ID' }, { name: '🇺🇸 North America', value: 'US' },
        { name: '🇪🇺 Europe', value: 'EU' }, { name: '🌏 Asia', value: 'AS' }
      ))
    .addStringOption(o => o.setName('skin').setDescription('Update Skin URL').setRequired(false)),
  new SlashCommandBuilder().setName('rankings').setDescription('Lihat top 10 pemain')
    .addStringOption(o => o.setName('category').setDescription('Pilih Kategori').setRequired(true)
      .addChoices(
        { name: '🏆 Overall', value: 'overall' },
        { name: '⚔️ Sword', value: 'sword' }, { name: '🛡️ SMP', value: 'smp' },
        { name: '🔨 Mace', value: 'mace' }, { name: '🧪 Pot', value: 'pot' },
        { name: '🟢 Vanilla', value: 'vanilla' }, { name: '💎 NethOP', value: 'nethop' },
        { name: '🪓 Axe', value: 'axe' }, { name: '❤️ UHC', value: 'uhc' }
      )),
  new SlashCommandBuilder().setName('profile').setDescription('Lihat profil pemain')
    .addStringOption(o => o.setName('username').setDescription('Minecraft Username').setRequired(true)),
];

client.once('clientReady', async () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    const route = process.env.GUILD_ID
      ? Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID)
      : Routes.applicationCommands(client.user.id);
    await rest.put(route, { body: commands });
    console.log('✅ Slash commands registered');
  } catch (e) { console.error(e); }
});

client.on('error', e => console.error('Discord Client Error:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  console.log(`[Interaction] ${interaction.commandName} by ${interaction.user.tag} (${interaction.id})`);

  try {
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const publicCommands = ['rankings', 'profile'];

    if (staffRoleId && !publicCommands.includes(interaction.commandName) && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: '❌ Hanya **Staff BrutalMC** yang bisa memakai perintah ini.', flags: [MessageFlags.Ephemeral] });
    }

    // Always defer immediately for consistency
    await interaction.deferReply();

    switch (interaction.commandName) {
      case 'addtier': {
        const username = interaction.options.getString('username');
        const discordUser = interaction.options.getUser('user');
        const country_code = interaction.options.getString('location');
        const tier = interaction.options.getString('tier');
        const categorySlug = interaction.options.getString('category');
        const skin_url = interaction.options.getString('skin');
        const uuid = await getUUID(username);

        const { data: p } = await supabase.from('players').upsert({
          username, discord_id: discordUser.id, country_code, skin_url, mc_uuid: uuid
        }, { onConflict: 'username' }).select().single();

        const { data: c } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
        await supabase.from('player_tiers').upsert({ player_id: p.id, category_id: c.id, tier });

        const { totalPoints, badge } = await recalcPlayer(p.id);

        const embed = new EmbedBuilder()
          .setTitle('✅ Tier Updated').setColor(0x5b8dea)
          .setThumbnail(`https://mc-heads.net/avatar/${uuid || username}/128`)
          .addFields(
            { name: '👤 Player', value: `**${username}**`, inline: true },
            { name: `${TIER_EMOJI[tier]} Tier`, value: `**${tier}**`, inline: true },
            { name: '📂 Category', value: `**${categorySlug}**`, inline: true },
            { name: '🏆 Points', value: `**${totalPoints} PTS**`, inline: true },
            { name: `${badge.emoji} Rank`, value: `**${badge.label}**`, inline: true }
          ).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'removetier': {
        const username = interaction.options.getString('username');
        const categorySlug = interaction.options.getString('category');
        const { data: p } = await supabase.from('players').select('id').eq('username', username).single();
        const { data: c } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();

        if (p && c) {
          await supabase.from('player_tiers').delete().eq('player_id', p.id).eq('category_id', c.id);
          const { totalPoints, badge } = await recalcPlayer(p.id);
          await interaction.editReply(`🗑️ Tier **${username}** di **${categorySlug}** dihapus. Points: **${totalPoints}**.`);
        } else {
          await interaction.editReply('❌ Player/Kategori tidak ditemukan.');
        }
        break;
      }

      case 'rankings': {
        const categorySlug = interaction.options.getString('category');
        const embed = new EmbedBuilder().setColor(0x5b8dea).setTimestamp();

        if (categorySlug === 'overall') {
          embed.setTitle('🏆 TOP 10 OVERALL');
          const { data } = await supabase.from('players').select('*, player_tiers(tier, categories(slug))').order('total_points', { ascending: false }).limit(10);
          const lines = data?.map((p, i) => `${i + 1}. **${p.username}** • ${getBadge(p.total_points).emoji} ${p.total_points} PTS`) || [];
          embed.setDescription(lines.join('\n') || 'No data');
        } else {
          embed.setTitle(`📂 ${categorySlug.toUpperCase()} RANKINGS`);
          const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).single();
          const { data } = await supabase.from('player_tiers').select('tier, players(username, total_points, country_code)').eq('category_id', cat.id).limit(10);
          const lines = data?.map((t, i) => `${i + 1}. **${t.players?.username}** — ${TIER_EMOJI[t.tier]} **${t.tier}**`) || [];
          embed.setDescription(lines.join('\n') || 'No data');
        }
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'profile': {
        const username = interaction.options.getString('username');
        const { data: p } = await supabase.from('players').select('*, player_tiers(tier, categories(slug, name))').eq('username', username).single();
        if (!p) return await interaction.editReply('❌ Player tidak ditemukan.');

        const badge = getBadge(p.total_points);
        const uuid = p.mc_uuid || username;
        const tierLines = p.player_tiers?.map(t => `${TIER_EMOJI[t.tier]} **${t.categories?.name}** → **${t.tier}**`) || [];

        const embed = new EmbedBuilder()
          .setTitle(`${badge.emoji} ${p.username}`).setColor(0x5b8dea)
          .setThumbnail(`https://mc-heads.net/avatar/${uuid}/128`)
          .setImage(`https://mc-heads.net/body/${uuid}/right`)
          .addFields(
            { name: '🏆 Rank', value: `**${badge.label}**`, inline: true },
            { name: '⭐ Points', value: `**${p.total_points}**`, inline: true },
            { name: '📂 Tiers', value: tierLines.join('\n') || '*No tiers*' }
          ).setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        break;
      }

      case 'deleteplayer': {
        const username = interaction.options.getString('username');
        const { data: p } = await supabase.from('players').select('id').eq('username', username).single();
        if (p) {
          await supabase.from('player_tiers').delete().eq('player_id', p.id);
          await supabase.from('players').delete().eq('id', p.id);
          await interaction.editReply(`🗑️ **${username}** dihapus.`);
        } else {
          await interaction.editReply('❌ Player tidak ditemukan.');
        }
        break;
      }
    }
  } catch (err) {
    console.error('Interaction Error:', err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Terjadi kesalahan internal.' }).catch(() => { });
    } else {
      await interaction.reply({ content: '❌ Terjadi kesalahan internal.', flags: [MessageFlags.Ephemeral] }).catch(() => { });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

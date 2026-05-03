const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes, MessageFlags } = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsArray = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commandsArray.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot Online: ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    const route = process.env.GUILD_ID 
      ? Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID) 
      : Routes.applicationCommands(client.user.id);
    await rest.put(route, { body: commandsArray });
    console.log('✅ Slash commands registered successfully.');
  } catch (e) { 
    console.error('Failed to register slash commands:', e); 
  }
});

client.on('error', e => console.error('Discord Client Error:', e));
process.on('unhandledRejection', e => console.error('Unhandled Rejection:', e));

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  console.log(`[Interaction] /${interaction.commandName} by ${interaction.user.tag}`);

  try {
    const staffRoleId = process.env.STAFF_ROLE_ID;
    const publicCommands = ['rankings', 'profile'];
    
    // Authorization check
    if (staffRoleId && !publicCommands.includes(interaction.commandName)) {
      if (!interaction.member || !interaction.member.roles.cache.has(staffRoleId)) {
        return interaction.reply({ content: '❌ Hanya **Staff BrutalMC** yang bisa memakai perintah ini.', flags: [MessageFlags.Ephemeral] });
      }
    }

    // Acknowledge interaction to prevent timeout
    await interaction.deferReply();

    // Execute command
    await command.execute(interaction);
    
  } catch (err) {
    console.error(`Error executing ${interaction.commandName}:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: '❌ Terjadi kesalahan internal saat mengeksekusi perintah ini.' }).catch(() => {});
    } else {
      await interaction.reply({ content: '❌ Terjadi kesalahan internal saat mengeksekusi perintah ini.', flags: [MessageFlags.Ephemeral] }).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

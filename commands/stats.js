const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('stats')
		.setDescription('Retrieve stats for a player.')
        .addNumberOption(option => option.setName('steamid').setDescription('64 Steam ID of the player whose stats to retrieve.'))
		.AddUserOption(option => option.setName('user').setDescription('Discord user to retrieve stats for.')),
	async execute(interaction) {
		const steamid = interaction.options.getNumber('steamid');
		const user = interaction.options.getUser('user');

		if (!steamid && !user) {
			await interaction.reply({
				content: 'You must provide either a steamid or a user.',
				ephemeral: true,
			});
			return;
		}
		else if (steamid && user) {
			await interaction.reply({
				content: 'You must provide either a steamid or a user, not both.',
				ephemeral: true,
			});
			return;
		}
		if (steamid)
	},
};
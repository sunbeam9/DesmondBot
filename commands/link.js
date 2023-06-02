const { SlashCommandBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('link')
		.setDescription('Allows Desmond Bot to associate your steam account with your discord account.'),
	async execute(interaction) {
		const user = await interaction.client.Users.findOne({
			where: {
				DiscordID: interaction.user.id,
			},
		});

		if (user) {
			await interaction.reply({
				content: `You have already linked your steam account (https://steamcommunity.com/profiles/${user.SteamID}) to your discord account.`,
				ephemeral: true,
			});
			return;
		}

        const link = new ButtonBuilder()
            .setLabel('Link your accounts')
            .setURL(process.env.REDIRECT_URI)
			.setStyle(ButtonStyle.Link);

        const row = new ActionRowBuilder()
			.addComponents(link);

		await interaction.reply({
			content: 'Click the button below to link your accounts. Please make sure that you have your steam profile linked in connections.',
			components: [row],
            ephemeral: true,
		});
	},
};
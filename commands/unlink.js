const { SlashCommandBuilder, ButtonStyle, ButtonBuilder, ActionRowBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('unlink')
		.setDescription('Disassociate your steam account from your discord account with Desmond Bot.'),
	async execute(interaction) {
        const user = await interaction.client.Users.findOne({
            where: {
                DiscordID: interaction.user.id,
            },
        });

		if (!user) {
			await interaction.reply({
				content: 'You have not linked your steam account to your discord account. You can use /link to link your accounts.',
				ephemeral: true,
			});
			return;
		}

        await interaction.client.Users.destroy({
            where: {
                DiscordID: interaction.user.id,
            },
        });

        await interaction.reply({
            content: `Succesfully unlinked https://steamcommunity.com/profiles/${user.SteamID} ! You can use /link to link your accounts again.`,
            ephemeral: true,
        });
	},
};
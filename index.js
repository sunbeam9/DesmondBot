const { request } = require("undici");
const express = require("express");
const app = express();
const fs = require("node:fs");
const path = require("node:path");
const Sequelize = require("sequelize");

require("dotenv").config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const port = process.env.PORT;
const redirectUri = process.env.REDIRECT_URI;
const oauthPath = new URL(redirectUri).pathname;

const {
	Client,
	Collection,
	REST,
	Routes,
	GatewayIntentBits,
} = require("discord.js");
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const sequelize = new Sequelize("database", "username", "password", {
	dialect: "mysql",
	dialectOptions: {
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	},
});

const Users = sequelize.define("DesmondBot_Users", {
	DiscordID: {
		type: Sequelize.BIGINT.UNSIGNED,
		primaryKey: true,
		allowNull: false,
	},
	SteamID: {
		type: Sequelize.BIGINT(17).UNSIGNED,
		allowNull: false,
	},
});
const Stats = sequelize.define(process.env.DB_TABLENAME, {
	PlayerId: {
		type: Sequelize.BIGINT(17).UNSIGNED,
		primaryKey: true,
		allowNull: false,
	},
	Kills: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	GunKills: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	MeleeKills: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	Deaths: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	ShotsMissed: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	Headshots: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	Hits: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
	HoursPlayed: {
		type: Sequelize.DOUBLE,
		allowNull: true,
	},
	Joins: {
		type: Sequelize.INTEGER.UNSIGNED,
		allowNull: true,
	},
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.Users = Users;
client.Stats = Stats;

// Read all the command files from the commands directory and add them to client.commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(
			`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
		);
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		const commands = client.commands.map((command) =>
			command.data.toJSON()
		);
		console.log(
			`Started refreshing ${commands.length} application (/) commands.`
		);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(Routes.applicationCommands(clientId), {
			body: commands,
		});

		console.log(
			`Successfully reloaded ${data.length} application (/) commands.`
		);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();

// Read all the event files from the events directory and add them to client.events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
	.readdirSync(eventsPath)
	.filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

app.route(oauthPath)
	.post(async ({ query }, response) => {
		const { code } = query;

		if (code) {
			try {
				const tokenResponseData = await request(
					"https://discord.com/api/oauth2/token",
					{
						method: "POST",
						body: new URLSearchParams({
							client_id: clientId,
							client_secret: clientSecret,
							code,
							grant_type: "authorization_code",
							redirect_uri: redirectUri,
							scope: "identify",
						}).toString(),
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
					}
				);

				const oauthData = await tokenResponseData.body.json();

				if (tokenResponseData.statusCode == 401) {
					console.error(oauthData);
				}

				// get the user's discord id
				const discordResponseData = await request(
					"https://discord.com/api/users/@me",
					{
						method: "GET",
						headers: {
							authorization: `${oauthData.token_type} ${oauthData.access_token}`,
						},
					}
				);

				const discord = await discordResponseData.body.json();
				console.log(discord.id);

				// get the user's steam id from connected accounts
				const connectionsResponseData = await request(
					"https://discord.com/api/users/@me/connections",
					{
						method: "GET",
						headers: {
							authorization: `${oauthData.token_type} ${oauthData.access_token}`,
						},
					}
				);

				const connections = await connectionsResponseData.body.json();
				const steam = connections.find(
					(connection) => connection.type === "steam"
				);
				console.log(steam);

				if (!steam) {
					client.users.send(
						discord.id,
						"The bot requires a steam account to be connected to your discord account. Please connect your steam account and try again. You can use https://www.minitool.com/news/link-steam-to-discord.html as a guide."
					);
				} else {
					try {
						const user = await Users.create({
							DiscordID: discord.id,
							SteamID: steam.id,
						});
					} catch (error) {
						if (error.name === "SequelizeUniqueConstraintError") {
							client.users.send(
								discord.id,
								`You have already linked your steam account (https://steamcommunity.com/profiles/${steam.id}) to your discord account.`
							);
							return;
						}

						client.users.send(
							discord.id,
							`An error occured while linking your steam account (https://steamcommunity.com/profiles/${steam.id}) to your discord account. Please try again later.`
						);
						return;
					}

					client.users.send(
						discord.id,
						`Succesfully linked https://steamcommunity.com/profiles/${steam.id} ! You can use /unlink to unlink your account at anytime.`
					);
				}

				response.status(201).send();
			} catch (error) {
				// NOTE: An unauthorized token will not throw an error
				// tokenResponseData.statusCode will be 401
				console.error(error);
				// return 500 to indicate that the request was unsuccessful
				response.status(500).send();
			}
		}
	})
	.get((request, response) => response.sendFile("index.html", { root: "." }));

app.get("/clientId", (request, response) => {
	response.send({ clientId: clientId });
});

app.get("/redirectUri", (request, response) => {
	response.send({ redirectUri: redirectUri });
});

// start the bot

client.login(token);

app.listen(port, async () => {
	console.log(`App listening at http://localhost:${port}`);
	try {
		await sequelize.authenticate();
		console.log(
			"Connection to the database has been established successfully."
		);
		Users.sync();
		Stats.sync();
	} catch (error) {
		console.error("Unable to connect to the database:", error);
	}
});

const TwitchJS = require('twitch-js')
const request = require('request-promise');
const config = require('./config.json');

const options = {
    options: {
        debug: config.debug
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: config.username,
        password: `oauth:${config.oauth}`

    },
    channels: config.channels
};

main();
async function main() {
	const channels = new Map(await getChannelIds(config.channels));
	if (channels.size < 1) {
		console.error('No channels were found. Quitting');
		return;
	}

	var client = new TwitchJS.client(options);
	client.connect();

	client.on("connected", () => {
		if (config.enableTimedMessage) {
			setInterval(() => {
				timedMessage(client, channels, config.timedMessage)},
				config.timedMessageSecs * 1000
			);
		}
	});

	client.on("chat", async function (channel, user, message, self) {
		let commandFound = 0;
		config.commandAliases.forEach(alias => {
			if (message.toLowerCase().indexOf(`!${alias}`) === 0) commandFound = 1;
		});
		if (!commandFound) return;

		const userDisplayName = user['display-name'];
		if (await allowRequest(user, channels.get(channel))) {
			const song = requestsong(user, message);
			let response = `@${userDisplayName}, try "!songsuggestion Song by Band"`;
			if (song) {
				response = `Song: "${song}" suggested by ${userDisplayName}`;
			}
			sendChatMessage(client, channel, response)
		} else {
			sendChatMessage(client, channel, `@${userDisplayName}, please Follow to suggest a song`)
		}
	});
}

// Checks if a song request should be allowed based on settings
// EX: if subs only checks for subs, if followers only checks if they're following
async function allowRequest(user, channel) {
	if (user.mod || user.subscriber) return true;
	if (config.subscribersOnly) return false;
	if (config.followersOnly) {
		if (await isFollower(user, channel)) {
			return true;
		}
		return false;
	}
	return true;
}


// Currently, simply logs out successful song requests
function requestsong(user, message) {
	const song = message.split(' ').splice(1).join(' ');
	if(song) {
		console.log(`"${song}" by ${user.username}`);
		return song;
	}
	return false;
}

function sendChatMessage(client, channel, message) {
	client.say(channel, message)
	.catch(error => {
		console.error(error);
	});
}

// Checks if a user if following the channel they requested a song in
function isFollower(user, channel) {
	const uri = `https://api.twitch.tv/kraken/users/${user['user-id']}/follows/channels/${channel}`;
	const options = {
		uri,
		headers: {
			Accept: 'application/vnd.twitchtv.v5+json',
			'Client-ID': config.clientId,
			'Authorization': `OAuth ${config.oauth}`
		},
		method: 'GET',
		json: true
	};

	return request(options)
	.then(body => {
		if (body.channel) {
			return true;
		} else {
			return false;
		}
	}).catch(error => {
		return false;
	})
}

// Runs only on startup, convirts channel names to channelIds for API calls
function getChannelIds(channels) {
	let loginStr = '';
	channels.forEach(channel => {
		loginStr += `,${channel.replace('#', '')}`;
	})
	// TODO use helix endpoint (login&=login&=)
	const uri = `https://api.twitch.tv/kraken/users?login=${loginStr.slice(1)}`;
	const options = {
		uri,
		headers: {
			Accept: 'application/vnd.twitchtv.v5+json',
			'Client-ID': config.clientId,
			'Authorization': `OAuth ${config.oauth}`
		},
		method: 'GET',
		json: true
	};

	return request(options)
	.then(body => {
		return body.users.map(user => {
			return [`#${user.name}`, user._id]
		})
	}).catch(error => {
		console.error(error);
		return [];
	});
}

async function timedMessage(client, channels, message) {
	channels.forEach((channelId, channel) => {
		sendChatMessage(client, channel, message);
	});
}

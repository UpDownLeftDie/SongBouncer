const tmi = require('tmi.js');
const request = require('request-promise');
const config = require('./config.json');

const options = {
    options: {
        debug: true
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
console.log(options);

main();
async function main() {
	const channels = new Map(await getChannelIds(config.channels));
	if (channels.length < 1) {
		console.error('No channels were found. Quitting');
		return;
	}

	var client = new tmi.client(options);
	client.connect();

	client.on("chat", async function (channel, user, message, self) {
		if (message.indexOf('!songsuggestion') !== 0 && message.indexOf('!suggestsong') !== 0) {
			return;
		}
		console.log(user)
		const userDisplayName = user['display-name'];
		if (user.mod || user.subscriber || await isFollower(user, channel)) {
			const song = await requestsong(user, message);
			let response = `@${userDisplayName}, try "!songsuggestion song name"`;
			if (song) {
				response = `Song: "${song}" suggested by ${userDisplayName}`;
			}
			console.log(channel);
			client.say(channel, response)
			.catch(error => {
				console.error(error);
			});
		} else {
			client.say(channel, `@${userDisplayName}, please Follow to suggest a song`)
			.catch(error => {
				console.error(error);
			});
		}
	});
}


async function requestsong(user, message) {
	const song = message.split(' ').splice(1).join(' ');
	if(song) {
		console.log(`"${song}" by ${user.username}`);
		return song;
	}
	return false;
}

function isFollower(user, channel) {
	const uri = `https://api.twitch.tv/kraken/users/${user['user-id']}/follows/channels/${channels.get(channel)}`;
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

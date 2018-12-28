const TwitchJS = require('twitch-js');
const request = require('request-promise');
const config = require('./config.json');
const SongRequestQueue = require('./classes/song-request-queue');
const stdin = process.openStdin();
stdin.setRawMode( true );
stdin.resume();
stdin.setEncoding( 'utf8' );

const options = {
    options: {
        debug: config.debug
    },
    connection: {
        reconnect: true
    },
    identity: {
        username: config.botUsername,
        password: `oauth:${config.oauth}`

    },
    channels: config.channels
};
const queue = new SongRequestQueue();
async function getViewers() {
	const results = await request('https://tmi.twitch.tv/group/user/updownleftdie/chatters');
	const viewers = JSON.parse(results).chatters.viewers;
	queue.updateQueues(viewers);
}

main();
async function main() {
	setInterval(getViewers, config.inactiveUserBufferMs);
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

	stdin.on( 'data', function( key ){
		// ctrl-c ( end of text )
		if ( key === '\u0003' ) {
		  process.exit();
		}
		if (key === 'n') {
			const nextSong = queue.nextSong();
			if (!nextSong) return;
			console.log(`\nNext song: ${nextSong.song} requested by ${nextSong.requester}\n`);
		}
	  });

	client.on("chat", async function (channel, user, message, self) {
		const userDisplayName = user['display-name'];

		if (message.toLowerCase().indexOf(`!next`) === 0){
			const nextRequest = queue.peek();
			if (!nextRequest) return sendChatMessage(client, channel, `@${userDisplayName}, No songs have been requested!`);
			return sendChatMessage(client, channel, `Next song: "${nextRequest.song}." Requested by @${nextRequest.requester}.`)
		}

		if (message.toLowerCase().indexOf(`!queue`) === 0){
			const queueLength = queue.getLength();
			if (queueLength === 0) {
				return sendChatMessage(client, channel, `The queue is empty!`);
			}
			let count = 5;
			if (queueLength < 5) count = queueLength;
			const topSongs = queue.topSongs(count);
			let i = 0;
			const nextSongList = topSongs.map(request => {
				i++;
				return `${i}. ${request.song}`
			}).join(', ');
			
			return sendChatMessage(client, channel, `There are ${queueLength} requests. The next ${count} songs are: ${nextSongList}`);
		}

		let commandFound = 0;
		config.commandAliases.forEach(alias => {
			if (message.toLowerCase().indexOf(`!${alias}`) === 0) commandFound = 1;
		});
		if (!commandFound) return;

		if (await allowRequest(user, channels.get(channel))) {
			const song = requestsong(user, message);
			let response = `@${userDisplayName}, try "!${config.commandAliases[0]} Song by Band"`;
			if (song) {
				queue.enqueue(userDisplayName, song);
				response = `@${userDisplayName}, "${song}" was added to the queue.`;
			}
			sendChatMessage(client, channel, response);
		} else {
			sendChatMessage(client, channel, `@${userDisplayName}, please Follow to suggest a song`);
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

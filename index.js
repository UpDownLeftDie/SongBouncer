const TwitchJs = require("twitch-js").default;
const request = require("request-promise");
const config = require("./config.json");
const SongRequestQueue = require("./classes/song-request-queue");
const stdin = process.openStdin();
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

const options = {
  options: {
    debug: config.debug
  },
  connection: {
    reconnect: true
  },
  identity: {
    username: config.botUsername,
    token: `oauth:${config.oauth}`
  },
  channels: config.channels
};
const queue = new SongRequestQueue();
const commands = require("./commands")(queue);
async function getViewers() {
  const mainChannel = config.channels[0].slice(1);
  const twitchChattersUrl = `https://tmi.twitch.tv/group/user/${mainChannel}/chatters`;
  const response = await request(twitchChattersUrl);
  const results = JSON.parse(response);
  const chatters = Object.keys(results.chatters).reduce((combined, role) => {
    return combined.concat(results.chatters[role] || []);
  }, []);
  queue.updateQueues(chatters);
}

queue.printTerminal();
main();

async function main() {
  setInterval(getViewers, config.inactiveUserBufferMs);
  const channels = new Map(await getChannelIds(config.channels));
  if (channels.size < 1) {
    console.error("No channels were found. Quitting");
    return;
  }

  const logLevel = options.options.debug ? 1 : 0;
  const { _, chat } = new TwitchJs({
    token: options.identity.token,
    username: options.identity.username,
    log: { level: logLevel }
  });

  chat.connect().then(() => {
    for (const [key] of channels) {
      chat.join(key);
    }

    if (config.enableTimedMessage) {
      setInterval(() => {
        timedMessage(chat, channels, config.timedMessage);
      }, config.timedMessageSecs * 1000);
    }

    chat.on("PRIVMSG", async function(event) {
      const { tags: user, message, channel } = event;
      const { displayName } = user;

      if (message.toLowerCase().indexOf(`!next`) === 0) {
        commands.nextSong(chat, channel);
      }

      if (message.toLowerCase().indexOf(`!queue`) === 0) {
        commands.queue(chat, channel);
      }

      if (message.toLowerCase().indexOf(`!previous`) === 0) {
        commands.previousSong(chat, channel);
      }

      if (message.toLowerCase().indexOf(`!current`) === 0) {
        commands.currentSong(chat, channel);
      }

      let commandFound = false;
      let bsr = false;
      config.commandAliases.forEach(alias => {
        if (message.toLowerCase().indexOf(`!${alias}`) === 0)
          commandFound = true;
      });
      if (message.toLowerCase().indexOf(`!bsr`) === 0) {
        commandFound = true;
        bsr = true;
      }
      if (!commandFound) return;

      if (await allowRequest(user, channels.get(channel))) {
        const song = await requestSong(message, bsr);
        let response = `@${displayName}, Check: https://beatsaver.com/search first and then try "!${
          config.commandAliases[0]
        } Song by Band"`;
        if (bsr) response = `@${displayName}, song not found.`;
        if (song) {
          queue.enqueue(displayName, song);
          response = `@${displayName}, "${song}" was added to the queue.`;
        }
        commands.sendChatMessage(chat, channel, response);
      } else {
        commands.sendChatMessage(
          chat,
          channel,
          `@${displayName}, please Follow to suggest a song`
        );
      }
    });
  });

  stdin.on("data", function(key) {
    // ctrl-c ( end of text )
    if (key === "\u0003") {
      process.exit();
    }
    if (key === "n") {
      const nextSong = queue.nextSong();
      if (!nextSong) return;
      // console.log(`\nNext song: ${nextSong.song} requested by ${nextSong.requester}\n`);
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
async function requestSong(message, bsr) {
  let request = message
    .split(" ")
    .splice(1)
    .join(" ");
  if (!request) {
    return false;
  }

  if (bsr) {
    try {
      request = await getSongFromBeatSaver(request);
    } catch (error) {
      console.error("Error getting song from beatsaver");
      return false;
    }
  }
  return request;
}

// Checks if a user if following the channel they requested a song in
function isFollower(user, channel) {
  const uri = `https://api.twitch.tv/kraken/users/${
    user["user-id"]
  }/follows/channels/${channel}`;
  const options = {
    uri,
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": config.clientId,
      Authorization: `OAuth ${config.oauth}`
    },
    method: "GET",
    json: true
  };

  return request(options)
    .then(body => {
      if (body.channel) {
        return true;
      } else {
        return false;
      }
    })
    .catch(_ => {
      return false;
    });
}

// Runs only on startup, converts channel names to channelIds for API calls
function getChannelIds(channels) {
  let loginStr = "";
  channels.forEach(channel => {
    loginStr += `,${channel.replace("#", "")}`;
  });
  // TODO use helix endpoint (login&=login&=)
  const uri = `https://api.twitch.tv/kraken/users?login=${loginStr.slice(1)}`;
  const options = {
    uri,
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": config.clientId,
      Authorization: `OAuth ${config.oauth}`
    },
    method: "GET",
    json: true
  };

  return request(options)
    .then(body => {
      return body.users.map(user => {
        return [`#${user.name}`, user._id];
      });
    })
    .catch(error => {
      console.error(error);
      return [];
    });
}

async function timedMessage(chat, channels, message) {
  channels.forEach((_, channel) => {
    commands.sendChatMessage(chat, channel, message);
  });
}

async function getSongFromBeatSaver(id) {
  const url = `https://beatsaver.com/api/maps/detail/${id}`;
  const response = await request(url);
  let song = "";
  try {
    song = JSON.parse(response);
    if (!song || !song.name) throw "Not Found";
  } catch (error) {
    throw error;
  }
  return song.name;
}

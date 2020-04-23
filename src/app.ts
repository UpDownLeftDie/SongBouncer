const TwitchJs = require("twitch-js").default;
const request = require("request-promise");
const config = require("../config.json");
const SongRequestQueue = require("./classes/song-request-queue");
const stdin = process.openStdin();
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

const options = {
  options: {
    debug: config.debug,
  },
  connection: {
    reconnect: true,
  },
  identity: {
    username: config.botUsername.trim(),
    token: `oauth:${config.oauth.trim().replace(/^oauth:/i, "")}`,
  },
  channels: config.channels,
  modules: config.modules,
  beatSaverHashUrl: config.beatSaverHashUrl.trim().replace(/\/$/, ""),
  beatSaverSearchUrl: config.beatSaverSearchUrl.trim().replace(/\/$/, ""),
};
const queue = new SongRequestQueue();
const commands = require("./commands")(queue);
async function getViewers() {
  const mainChannel = config.channels[0].trim().slice(1);
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
    log: { level: logLevel },
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

    chat.on("PRIVMSG", async function (event) {
      const { tags: user, message, channel } = event;
      const { displayName } = user;

      if (message.toLowerCase().indexOf(`!next`) === 0) {
        commands.nextSong(chat, channel);
        return;
      }

      if (message.toLowerCase().indexOf(`!queue`) === 0) {
        commands.queue(chat, channel);
        return;
      }

      if (message.toLowerCase().indexOf(`!previous`) === 0) {
        commands.previousSong(chat, channel);
        return;
      }

      if (message.toLowerCase().indexOf(`!current`) === 0) {
        commands.currentSong(chat, channel);
        return;
      }

      if (message.toLowerCase().indexOf(`!remove`) === 0 && user.mod) {
        commands.removeSong(chat, channel, message);
        return;
      }

      let commandFound = false;
      config.commandAliases.forEach((alias) => {
        if (message.toLowerCase().indexOf(`!${alias}`) === 0)
          commandFound = "sr";
      });
      if (
        options.modules.beatsaber &&
        message.toLowerCase().indexOf("!bsr") === 0
      ) {
        commandFound = "bsr";
      }
      if (!commandFound) return;

      const reasonDenied = await denyRequest(user, channels.get(channel));
      if (!reasonDenied) {
        const [song, err] = await requestSong(
          message,
          commandFound,
          options.modules,
        );
        let response = `@${displayName}: Check: https://beatsaver.com/search first and then try "!${config.commandAliases[0]} Song by Band"`;
        if (song) {
          queue.enqueue(displayName, song);
          response = `@${displayName}: "${song}" was added to the queue.`;
        }
        if (err) {
          response = `@${displayName}: ${err}`;
        }
        commands.sendChatMessage(chat, channel, response);
      } else {
        commands.sendChatMessage(
          chat,
          channel,
          `@${displayName}: ${reasonDenied}`,
        );
      }
    });
  });

  stdin.on("data", function (key) {
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
async function denyRequest(user, channel) {
  if (user.mod || user.subscriber) return null;
  if (config.subscribersOnly) return "only subs/mods can request songs";
  if (config.followersOnly) {
    if (await isFollower(user, channel)) {
      return null;
    }
    return "please Follow the channel first and try again";
  }
  return null;
}

// Currently, simply logs out successful song requests
async function requestSong(message, command, modules) {
  let request = message.split(" ").splice(1).join(" ");
  if (!request) {
    return [null, null];
  }

  if (modules.beatsaber) {
    if (command === "bsr") {
      try {
        request = await getFromBeatSaverHash(request);
      } catch (error) {
        return [null, "no song with id found"];
      }
    } else {
      try {
        request = await getFromBeatSaverSearch(request);
      } catch (error) {
        return [null, "no songs found from search on BeatSaver"];
      }
    }
    if (request.stats.downVotes > request.stats.upVotes)
      return [null, "first search result has negative ratings on BeatSaver"];
    return [`${request.name}  (mapper: ${request.uploader.username})`, null];
  }
  return [request, null];
}

// Checks if a user if following the channel they requested a song in
function isFollower(user, channel) {
  const uri = `https://api.twitch.tv/kraken/users/${user.userId}/follows/channels/${channel}`;
  const options = {
    uri,
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": config.clientId,
      Authorization: `OAuth ${config.oauth}`,
    },
    method: "GET",
    json: true,
  };

  return request(options)
    .then((body) => {
      if (body.channel) {
        return true;
      } else {
        return false;
      }
    })
    .catch((_) => {
      return false;
    });
}

// Runs only on startup, converts channel names to channelIds for API calls
function getChannelIds(channels) {
  let loginStr = "";
  channels.forEach((channel) => {
    loginStr += `,${channel.replace("#", "")}`;
  });
  // TODO use helix endpoint (login&=login&=)
  const uri = `https://api.twitch.tv/kraken/users?login=${loginStr.slice(1)}`;
  const options = {
    uri,
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": config.clientId,
      Authorization: `OAuth ${config.oauth}`,
    },
    method: "GET",
    json: true,
  };

  return request(options)
    .then((body) => {
      return body.users.map((user) => {
        return [`#${user.name}`, user._id];
      });
    })
    .catch((error) => {
      console.error(error);
      return [];
    });
}

async function timedMessage(chat, channels, message) {
  channels.forEach((_, channel) => {
    commands.sendChatMessage(chat, channel, message);
  });
}

async function getFromBeatSaverHash(id) {
  const url = `${options.beatSaverHashUrl}/${id}`;
  const song = await getFromBeatSaver(url);
  try {
    if (!song || !song.name) throw "Not Found";
  } catch (error) {
    throw error;
  }
  return song;
}

async function getFromBeatSaverSearch(search) {
  const q = encodeURI(search);
  const url = `${options.beatSaverSearchUrl}?q=${q}`;
  const response = await getFromBeatSaver(url);
  let song = null;

  try {
    if (!response || response.totalDocs < 1) throw "Not Found";
    song = response.docs[0];
  } catch (error) {
    throw error;
  }
  return song;
}

async function getFromBeatSaver(url) {
  const response = await request(url, {
    headers: {
      authority: "beatsaver.com",
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36",
    },
  });
  return JSON.parse(response);
}

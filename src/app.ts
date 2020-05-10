import TwitchJs, { Message, Api, ApiVersions } from "twitch-js";
import request from "request-promise";
import config from "./config";
import queue from "./classes/songqueue";
import {
  getChannelIds,
  timedMessage,
  isFollower,
  sendChatMessage,
} from "./utils";
const stdin = process.openStdin();
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

const commands = require("./commands")(config.modules);
console.log(commands);
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

// queue.printTerminal();
main();

async function main() {
  const logLevel = config.options.debug ? "debug" : "error";
  const { api, chat } = new TwitchJs({
    token: config.identity.token,
    username: config.identity.username,
    log: { level: logLevel },
  });

  const channels = new Map(await getChannelIds(api, config.channels));
  if (channels.size < 1) {
    console.error("No channels were found. Quitting");
    return;
  }
  setInterval(getViewers, config.inactiveUserBufferSecs * 1000);

  chat.connect().then(() => {
    for (const [key] of channels) {
      chat.join(key);
    }

    if (config.enableTimedMessage) {
      setInterval(() => {
        const outputMessage = {
          chat,
          channels,
          message: config.timedMessage,
        };
        timedMessage(channels, outputMessage);
      }, config.timedMessageSecs * 1000);
    }

    // TODO update PRIVMSG to class
    chat.on("PRIVMSG", async function (event) {
      const { tags: user, message, channel } = event;
      const { displayName } = user;
      const outputMessage = { chat, channel, message: "" };

      // let commandFound = "";
      // config.commandAliases.forEach((alias) => {
      //   if (message.toLowerCase().indexOf(`!${alias}`) === 0)
      //     commandFound = "sr";
      // });

      let command = null;
      {
        const words = message.trim().toLowerCase().split(" ");
        console.log(words);
        if (words[0][0] !== "!") return;
        command = commands.get(words[0].slice(1));
      }
      if (!command) return;

      const reasonDenied = await denyRequest(user, channels.get(channel));
      if (!reasonDenied) {
        const [song, err] = await requestSong(message);
        if (song) {
          queue.enqueue(message, song);
          outputMessage.message = `@${displayName}: "${song}" was added to the queue.`;
        }
        if (err) {
          outputMessage.message = `@${displayName}: ${err}`;
        }
        sendChatMessage(outputMessage);
      } else {
        sendChatMessage({
          chat,
          channel,
          message: `@${displayName}: ${reasonDenied}`,
        });
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
async function requestSong(message) {
  let request = message.split(" ").splice(1).join(" ");
  if (!request) {
    return [null, null];
  }

  return [request, null];
}

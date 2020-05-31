import TwitchJs, { Message, Api, ApiVersions } from "twitch-js";
import request from "request-promise";
import config from "./config";
import queue from "./classes/songqueue";
import { ICommand, ICommands } from "./interfaces/ICommand";
import {
  getChannelIds,
  timedMessage,
  isFollower,
  sendChatMessage,
} from "./utils";
import IOutputMessage from "./interfaces/IOutputMessage";
const stdin = process.openStdin();
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

const commands: ICommands = require("./commands")(config.modules);

queue.printTerminal();
main();

async function main() {
  // Setup Keyboard commands
  // TODO Move these into keyboard.ts
  stdin.on("data", function (key) {
    // ctrl-c ( end of text )
    if (key === "\u0003") {
      process.exit();
    } else if (key === "n") {
      const nextSong = queue.nextSong();
      if (!nextSong) return;
      // console.log(`\nNext song: ${nextSong.song} requested by ${nextSong.requester}\n`);
    }
  });

  const logLevel = config.options.debug ? "debug" : "error";
  const { api, chat } = new TwitchJs({
    token: config.identity.token,
    username: config.identity.username,
    log: { level: logLevel },
  });

  const channels: Map<string, string> = new Map(
    await getChannelIds(api, config.channels),
  );
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
        timedMessage(chat, channels);
      }, config.timedMessageSecs * 1000);
    }

    // TODO update PRIVMSG to class
    chat.on("PRIVMSG", async function (event) {
      const { tags: user, message, channel } = event;
      const { displayName } = user;

      // let commandFound = "";
      // config.commandAliases.forEach((alias) => {
      //   if (message.toLowerCase().indexOf(`!${alias}`) === 0)
      //     commandFound = "sr";
      // });

      let command: ICommand | null = null;
      {
        const words = message.trim().toLowerCase().split(" ");
        if (words[0][0] !== "!") return;
        command = commands.get(words[0].slice(1));
      }
      if (!command) return;

      const channelId = channels.get(channel);
      const reasonDenied = await denyRequest(user, channelId);
      if (reasonDenied) {
        return sendChatMessage({
          chat,
          channelId,
          message: `@${displayName}: ${reasonDenied}`,
        });
      }

      const outputMessage: IOutputMessage = {
        chat,
        channelId,
        message: "Whoopies, something went wrong!",
      };
      return command.execute(outputMessage);
    });
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

import tmi, { Client, ChatUserstate } from "tmi.js";
import config from "./config";
import queue from "./classes/songqueue";
import { ICommand, ICommands, IPermissions } from "./interfaces/ICommand";
import {
  getChannelIds,
  timedMessage,
  isFollower,
  sendChatMessage,
  getViewers,
} from "./utils";
import { IInputMessage } from "./interfaces/IMessages";
const stdin: any = process.openStdin();
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

  const client: Client = tmi.Client({
    options: { debug: config.options.debug },
    connection: {
      reconnect: true,
      secure: true,
    },
    identity: {
      username: config.identity.username,
      password: config.identity.token,
    },
    channels: Array.isArray(config.channels)
      ? config.channels
      : [config.channels],
  });

  const channels: Map<string, string> = new Map(
    await getChannelIds(config.channels),
  );
  if (channels.size < 1) {
    console.error("No channels were found. Quitting");
    return;
  }
  setInterval(getViewers, config.inactiveUserBufferSecs * 1000);

  client.connect().then(() => {
    if (config.enableTimedMessage) {
      setInterval(() => {
        timedMessage(client, channels);
      }, config.timedMessageSecs * 1000);
    }

    client.on(
      "message",
      async (
        channel,
        userstate: ChatUserstate,
        message,
        self,
      ): Promise<void> => {
        if (self) return;
        const displayName = userstate["display-name"];

        let command: ICommand | null = null;
        let commandInput: string | null = null;
        let matchedKeyword: string = "";
        {
          const words = message.trim().toLowerCase().split(" ");
          if (words[0][0] !== "!") return;
          matchedKeyword = words[0].slice(1);
          command = commands.get(matchedKeyword);
          commandInput = words.splice(1).join(" ");
        }
        if (!command) return;

        const channelId = channels.get(channel);
        const reasonDenied = await denyRequest(
          userstate,
          channelId,
          command.permissions || {},
        );
        if (reasonDenied) {
          return sendChatMessage(
            {
              userstate,
              client,
              channel,
              message: reasonDenied,
            },
            true,
          );
        }

        const inputMessage: IInputMessage = {
          userstate,
          client,
          channel,
          message: commandInput,
        };
        await command.execute(inputMessage, matchedKeyword);
      },
    );
  });
}

// Checks if a song request should be allowed based on settings
// EX: if subs only checks for subs, if followers only checks if they're following
async function denyRequest(
  user: tmi.Userstate,
  channel: string,
  permissions: IPermissions,
) {
  if (user.broadcaster == "1") return null;
  if (permissions.broadcaster) {
    return "only the broadcaster can use this command";
  }
  if (user.mod) return null;
  if (permissions.mod) {
    return "only mods can use this command";
  }
  if (user.subscriber) return null;
  if (permissions.subscriber) {
    return "only subs can use this command";
  }
  if (permissions.follower && !(await isFollower(user, channel))) {
    return "please Follow the channel first and try again";
  }
  return null;
}

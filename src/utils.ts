import tmi, { Client } from "tmi.js";
import { IOutputMessage } from "./interfaces/IMessages";
import fetch from "node-fetch";
import config from "./config";
import queue from "./classes/songqueue";
import { ISongRequest } from "./interfaces/ISong";

// Runs only on startup, converts channel names to channelIds for API calls
export async function getChannelIds(
  channels: string[],
): Promise<[[string, string]] | []> {
  let loginStr = "";
  channels.forEach((channel) => {
    loginStr += `,${channel.replace("#", "")}`;
  });
  loginStr = loginStr.slice(1);

  // TODO use helix endpoint (login&=login&=)
  const url = `https://api.twitch.tv/kraken/users?login=${loginStr}`;
  const options = {
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": config.clientId,
      Authorization: `OAuth ${config.oauth}`,
    },
    method: "GET",
    json: true,
  };

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    return json.users.map(
      (user: {
        name: string;
        display_name: string;
        _id: string;
        type: string;
      }) => {
        return [`#${user.name}`, user._id];
      },
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Checks if a user if following the channel they requested a song in
export async function isFollower(
  user: tmi.Userstate,
  channel: string,
): Promise<boolean> {
  // TODO use helix endpoint?
  const url = `https://api.twitch.tv/kraken/users/${user["user-id"]}/follows/channels/${channel}`;
  const options = {
    headers: {
      Accept: "application/vnd.twitchtv.v5+json",
      "Client-ID": config.clientId,
      Authorization: `OAuth ${config.oauth}`,
    },
    method: "GET",
    json: true,
  };

  try {
    const res = await fetch(url, options);
    const json = await res.json();
    if (json.channel) {
      return true;
    } else {
      return false;
    }
  } catch (e) {
    return false;
  }
}

export async function timedMessage(
  client: Client,
  channels: Map<string, string>,
): Promise<void> {
  channels.forEach((name) => {
    const outputMessage: IOutputMessage = {
      client,
      channel: name,
      message: config.timedMessage,
    };
    sendChatMessage(outputMessage, false);
  });
}

export function sendChatMessage(
  outputMessage: IOutputMessage,
  reply: boolean = false,
): void {
  const { client, channel, userstate } = outputMessage;
  let message = outputMessage.message;
  const displayName = userstate?.["display-name"];
  if (reply && displayName) message = `@${displayName}: ${message}`;
  client.say(channel, message).catch((error) => {
    console.error(error);
  });
}

export function addSongSuccessMessage(
  outputMessage: IOutputMessage,
  songName: string,
  position: number,
  reply: boolean = true,
): void {
  outputMessage.message = `${songName} was added to the queue at #${position}`;
  sendChatMessage(outputMessage, reply);
}

export async function getViewers(): Promise<void> {
  const mainChannel = config.channels[0].trim().slice(1);
  const twitchChattersUrl = `https://tmi.twitch.tv/group/user/${mainChannel}/chatters`;
  // TODO probably should wrap this with try catch
  const res = await fetch(twitchChattersUrl);
  const json = await res.json();
  const chatters = Object.keys(json.chatters).reduce((combined, role) => {
    return combined.concat(json.chatters[role] || []);
  }, []);
  queue.updateQueues(chatters);
}

export function ordinalSuffix(i: number): string {
  var j = i % 10,
    k = i % 100;
  if (j == 1 && k != 11) {
    return i + "st";
  }
  if (j == 2 && k != 12) {
    return i + "nd";
  }
  if (j == 3 && k != 13) {
    return i + "rd";
  }
  return i + "th";
}

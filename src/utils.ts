import request from "request-promise";
import { Api, Chat } from "twitch-js";
import config from "./config";
import IOutputMessage from "./interfaces/IOutputMessage";
import queue from "./classes/songqueue";

// Runs only on startup, converts channel names to channelIds for API calls
export function getChannelIds(
  api: Api,
  channels: string[],
): Promise<[[string, string]]> {
  let loginStr = "";
  channels.forEach((channel) => {
    loginStr += `,${channel.replace("#", "")}`;
  });
  loginStr = loginStr.slice(1);

  // TODO use helix endpoint (login&=login&=)
  // TODO and use api from twitch-js
  const uri = `https://api.twitch.tv/kraken/users?login=${loginStr}`;
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
      return body.users.map(
        (user: {
          name: string;
          display_name: string;
          _id: string;
          type: string;
        }) => {
          return [`#${user.name}`, user._id];
        },
      );
    })
    .catch((error) => {
      console.error(error);
      return [];
    });
}

// Checks if a user if following the channel they requested a song in
export function isFollower(user, channel) {
  // TODO use helix endpoint?
  // TODO and use api from twitch-js?
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

export async function timedMessage(chat: Chat, channels: Map<string, string>) {
  channels.forEach((name, channelId) => {
    const outputMessage: IOutputMessage = {
      chat,
      channelId,
      message: config.timedMessage,
    };
    sendChatMessage(outputMessage);
  });
}

export function sendChatMessage(outputMessage: IOutputMessage) {
  const { chat, channelId, message } = outputMessage;
  chat.say(channelId, message).catch((error) => {
    console.error(error);
  });
}

export async function getViewers() {
  const mainChannel = config.channels[0].trim().slice(1);
  const twitchChattersUrl = `https://tmi.twitch.tv/group/user/${mainChannel}/chatters`;
  // TODO probably should wrap this with try catch
  const response = await request(twitchChattersUrl);
  const results = JSON.parse(response);
  const chatters = Object.keys(results.chatters).reduce((combined, role) => {
    return combined.concat(results.chatters[role] || []);
  }, []);
  queue.updateQueues(chatters);
}

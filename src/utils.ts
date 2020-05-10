import request from "request-promise";
import { Api } from "twitch-js";
import config from "./config";
import OutputMessage from "./interfaces/OutputMessage";

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

export async function timedMessage(channels, outputMessage: OutputMessage) {
  channels.forEach((_, channel) => {
    sendChatMessage(outputMessage);
  });
}

export function sendChatMessage(outputMessage: OutputMessage) {
  const { chat, channel, message } = outputMessage;
  chat.say(channel, message).catch((error) => {
    console.error(error);
  });
}

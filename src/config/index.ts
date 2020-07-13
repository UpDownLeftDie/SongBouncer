const config = require("../../config.json");

let error = "";
if (!config.oauth) {
  error = "Missing oauth key";
} else if (!config?.clientId) {
  error = "Missing clientId";
} else if (!config?.channels?.[0]) {
  error = "Need to specify Twitch channels";
} else if (!config?.botUsername) {
  error = "Missing botUsername";
}

if (error) {
  throw new Error(`⚠️ ${error} ⚠️`);
}

const oauth = config.oauth.trim().replace(/^oauth:/i, "");
const clientId = config.clientId.trim();
const botUsername = config.botUsername.trim();

export default {
  options: {
    debug: config?.debug || false,
  },
  connection: {
    reconnect: true,
  },
  oauth,
  clientId,
  identity: {
    username: botUsername,
    token: `oauth:${oauth}`,
  },
  commandAliases: config?.commandAliases?.map((alias: string) =>
    alias.trim().toLowerCase(),
  ) || ["sr", "songrequest"],
  followersOnly: !!config?.followersOnly || false,
  subscribersOnly: !!config?.subscribersOnly || false,
  channels: config.channels,
  modules: config?.modules || {},
  enableTimedMessage: !!config?.enableTimedMessage || false,
  timedMessageSecs: config?.timedMessageSecs || 900,
  inactiveUserBufferSecs: config?.inactiveUserBufferSecs || 60,
  timedMessage: config?.timedMessage,
  beatSaverKeyUrl:
    config?.beatSaverKeyUrl.trim().replace(/\/$/, "") ||
    "https://beatsaver.com/api/maps/detail",
  beatSaverSearchUrl:
    config?.beatSaverSearchUrl.trim().replace(/\/$/, "") ||
    "https://beatsaver.com/api/search/text/0",
};

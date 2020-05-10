import request from "request-promise";
import config from "../config";

export default [
  {
    name: "bsr",
    description: "Looks up a song by hashid",
    async execute() {
      let song = undefined;
      try {
        song = await getFromBeatSaverHash(request);
      } catch (error) {
        return [null, "no song with id found"];
      }
      if (song.stats.downVotes > song.stats.upVotes)
        return [null, "first search result has negative ratings on BeatSaver"];
      return [`${song.name}  (mapper: ${song.uploader.username})`, null];
    },
  },
  {
    name: "sr", // TODO update this with config aliases
    description: "Uses loose search to find a song",
    async execute() {
      message = `@${displayName}: Check: https://beatsaver.com/search first and then try "!${config.commandAliases[0]} Song by Band"`;
      let song = undefined;
      try {
        song = await getFromBeatSaverSearch(request);
      } catch (error) {
        return [null, "no songs found from search on BeatSaver"];
      }
      if (song.stats.downVotes > song.stats.upVotes)
        return [null, "first search result has negative ratings on BeatSaver"];
      return [`${song.name}  (mapper: ${song.uploader.username})`, null];
    },
  },
];

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

async function getFromBeatSaverHash(id) {
  const url = `${config.beatSaverHashUrl}/${id}`;
  const song = await getFromBeatSaver(url);
  try {
    if (!song || !song.name) throw "Not Found";
  } catch (error) {
    throw error;
  }
  return song;
}

async function getFromBeatSaverSearch(search) {
  const q = encodeURIComponent(search);
  const url = `${config.beatSaverSearchUrl}?q=${q}`;
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

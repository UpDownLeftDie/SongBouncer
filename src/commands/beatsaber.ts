import { IInputMessage, IOutputMessage } from "../interfaces/IMessages";
import { sendChatMessage } from "../utils";
import { IBSSong } from "../interfaces/BeatSaber";
import fetch from "node-fetch";
import songQueue from "../classes/songqueue";
import config from "../config";

export default [
  {
    name: [...config.commandAliases, "bsr"],
    description: "Searches BeatSaver.com or directly if hash ID is used",
    async execute(inputMessage: IInputMessage, matchedKeyword: string) {
      const displayName = inputMessage.userstate["display-name"];
      const request = inputMessage.message;
      const isBsrID: boolean =
        matchedKeyword === "bsr" ||
        (request && request.length < 5 && request.indexOf(" ") === -1);
      const outputMessage: IOutputMessage = {
        ...inputMessage,
        message: `@${displayName}: Check: https://beatsaver.com/search first and then try "!${config.commandAliases[0]} Song by Band"`,
      };
      if (isBsrID) {
        outputMessage.message = `@${displayName}: Check: https://beatsaver.com/search "!bsr (hash from url)"`;
      }

      if (!request) {
        return sendChatMessage(outputMessage);
      }

      let song = undefined;
      try {
        if (isBsrID) {
          song = await getFromBeatSaverHash(request);
        } else {
          song = await getFromBeatSaverSearch(request);
        }
      } catch (error) {
        return [null, "no songs found from search on BeatSaver"];
      }
      if (song.stats.downVotes > song.stats.upVotes) {
        outputMessage.message =
          "first search result has negative ratings on BeatSaver";
        return sendChatMessage(outputMessage);
      }

      const songStr = `${song.name}  (mapper: ${song.uploader.username})`;
      songQueue.enqueue(displayName, songStr);
      outputMessage.message = `@${displayName}: ${songStr} was added to the queue`;
      return sendChatMessage(outputMessage);
    },
  },
];

async function getFromBeatSaver(url: string) {
  const res = await fetch(url, {
    headers: {
      authority: "beatsaver.com",
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36",
    },
  });
  return await res.json();
}

async function getFromBeatSaverHash(id: string): Promise<IBSSong> {
  const url = `${config.beatSaverHashUrl}/${id}`;
  const song = await getFromBeatSaver(url);
  try {
    if (!song || !song.name) throw "Not Found";
  } catch (error) {
    throw error;
  }
  return song;
}

async function getFromBeatSaverSearch(search: string): Promise<IBSSong> {
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

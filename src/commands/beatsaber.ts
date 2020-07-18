import { IInputMessage, IOutputMessage } from "../interfaces/IMessages";
import { sendChatMessage, addSongSuccessMessage } from "../utils";
import { IBSSong } from "../interfaces/BeatSaber";
import fetch from "node-fetch";
import songQueue from "../classes/songqueue";
import config from "../config";

export default [
  {
    name: [...config.commandAliases, "bsr"],
    description:
      "Searches BeatSaver.com or gets songs directly if key ID is used",
    permissions: {
      follower: config.followersOnly,
      subscriber: config.subscribersOnly,
    },
    async execute(inputMessage: IInputMessage, matchedKeyword: string) {
      const displayName = inputMessage.userstate["display-name"];
      const request = inputMessage.message;
      const isBsrID: boolean =
        matchedKeyword === "bsr" ||
        (request && request.length < 5 && request.indexOf(" ") === -1); // key range from 1 to 4 characters without spaces
      const outputMessage: IOutputMessage = {
        ...inputMessage,
        message: `Check https://beatsaver.com/search first then: !bsr <key from url>`,
      };
      // if (isBsrID) {
      //   outputMessage.message = `Check https://beatsaver.com/search first then: !bsr <key from url>`;
      // }

      if (!request) {
        return sendChatMessage(outputMessage, true);
      }

      let song = undefined;
      try {
        if (isBsrID) {
          song = await getFromBeatSaverKey(request);
        } else {
          song = await getFromBeatSaverSearch(request);
        }
      } catch (error) {
        outputMessage.message = "no songs found from search on BeatSaver";
        return sendChatMessage(outputMessage, true);
      }
      if (song.stats.downVotes > song.stats.upVotes) {
        outputMessage.message =
          "first search result has negative ratings on BeatSaver";
        return sendChatMessage(outputMessage, true);
      }

      const position = songQueue.enqueue({
        song: song.name,
        uploader: song.uploader.username,
        key: song.key,
        requester: displayName,
      });

      const songStr = `${song.name}  (uploader: ${song.uploader.username})`;
      return addSongSuccessMessage(outputMessage, songStr, position, true);
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

async function getFromBeatSaverKey(id: string): Promise<IBSSong> {
  const url = `${config.beatSaverKeyUrl}/${id}`;
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

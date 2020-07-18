import { IOutputMessage, IInputMessage } from "../interfaces/IMessages";
import songQueue from "../classes/songqueue";
import config from "../config";
import {
  sendChatMessage,
  addSongSuccessMessage,
  ordinalSuffix,
} from "../utils";

export default [
  {
    name: config.commandAliases,
    description: "Adds a song to the queue",
    permissions: {
      follower: config.followersOnly,
      subscriber: config.subscribersOnly,
    },
    async execute(inputMessage: IInputMessage): Promise<void> {
      const displayName = inputMessage.userstate["display-name"];
      const song = inputMessage.message;
      const outputMessage: IOutputMessage = {
        ...inputMessage,
        message: "!sr <song>",
      };

      if (!song) {
        return sendChatMessage(outputMessage, true);
      }

      const position = songQueue.enqueue({ song, requester: displayName });
      addSongSuccessMessage(outputMessage, song, position, true);
    },
  },
  {
    name: "next",
    description: "Says the next song",
    permissions: {},
    async execute(inputMessage: IInputMessage) {
      const outputMessage: IOutputMessage = {
        ...inputMessage,
        message: "Song request queue is empty",
      };
      const nextRequest = songQueue.peek();
      if (nextRequest) {
        outputMessage.message = `Next song: "${nextRequest.song}." Requested by ${nextRequest.requester}.`;
      }
      return sendChatMessage(outputMessage, false);
    },
  },
  {
    name: "queue",
    description: "Says up to the next 5 songs in chat",
    permissions: {},
    async execute(inputMessage: IInputMessage) {
      const maxPrint = 5;
      const outputMessage = {
        ...inputMessage,
        message: "The queue is empty",
      };
      const queueLength = songQueue.getLength();
      if (queueLength === 0) {
        return sendChatMessage(outputMessage, false);
      }
      const count = Math.min(maxPrint, queueLength);
      const topSongs = songQueue.topSongs(count);
      const nextSongList = topSongs
        .map((request, i) => `${i + 1}. ${request.song}`)
        .join(", ");

      let nextStr = "";
      if (queueLength > maxPrint) nextStr = ` Next ${count}:`;
      outputMessage.message = `${queueLength} songs in queue.${nextStr} ${nextSongList}`;
      return sendChatMessage(outputMessage, false);
    },
  },
  {
    name: "current",
    description: "Says the current song",
    permissions: {},
    async execute(inputMessage: IInputMessage) {
      const outputMessage = {
        ...inputMessage,
        message: "No song has been selected yet",
      };
      const song = songQueue.current();
      if (song) {
        outputMessage.message = `Current song song is: ${song}`;
      }
      return sendChatMessage(outputMessage, false);
    },
  },
  {
    name: "previous",
    description: "Says the previous song",
    permissions: {},
    async execute(inputMessage: IInputMessage) {
      const outputMessage = {
        ...inputMessage,
        message: "No songs have been played yet",
      };
      const song = songQueue.previous();
      if (song) {
        outputMessage.message = `Previous song was: ${song}`;
      }
      return sendChatMessage(outputMessage, false);
    },
  },
  {
    name: ["remove", "removesilent"],
    description: "(Mods only) Removes a song from the queue",
    permissions: { mod: true },
    async execute(inputMessage: IInputMessage, matchedKeyword: string) {
      const input = inputMessage.message;
      const outputMessage: IOutputMessage = {
        ...inputMessage,
        message:
          '(Mods only) "!remove #" where # is the position in the queue or "!remove last" to remove the last song added',
      };
      if (!input) {
        return sendChatMessage(outputMessage, false);
      }

      let index = -1;
      if (input.toLowerCase() === "last") {
        index = songQueue.getLength() - 1;
      } else {
        index = parseInt(input, 10) - 1;
      }

      if (songQueue.isEmpty()) {
        outputMessage.message = "Queue is already empty";
      } else if (isNaN(index) || index < 0) {
        outputMessage.message = "Not a valid number";
      } else if (songQueue.getLength() < index + 1) {
        outputMessage.message =
          "Not that many songs in the queue. Check with !queue";
      } else {
        const removedSong = songQueue.removeSong(index);

        if (matchedKeyword === "removesilent") {
          const songPosition = ordinalSuffix(index + 1);
          outputMessage.message = `The ${songPosition} song in the queue was removed`;
        } else {
          outputMessage.message = `${removedSong.song} was removed`;
        }
      }
      return sendChatMessage(outputMessage, false);
    },
  },
  // {
  //   name: ["undo", "wrongsong"],
  //   description: "Users can remove their own song if the request comes back incorrectly",
  //   async execute(inputMessage: IInputMessage, matchedKeyword: string) {
  //     const input = inputMessage.message;
  //     const outputMessage: IOutputMessage = {
  //       ...inputMessage,
  //       message:
  //         'Use !wrongsong if the wrong song was added to the queue',
  //     };
  //     return sendChatMessage(outputMessage, false);
  //   },
  // },
];

import { ISongQueue } from "../interfaces/ISong";
import songQueue from "../classes/songqueue";
import { sendChatMessage } from "../utils";
import OutputMessage from "../interfaces/OutputMessage";

export default [
  {
    name: "sr", // TODO update this with config
    description: "Adds a song to the queue",
    execute(outputMessage: OutputMessage) {},
  },
  {
    name: "next",
    description: "Says the next song",
    execute(outputMessage: OutputMessage) {
      const nextRequest = songQueue.peek();
      outputMessage.message = `Next song: "${nextRequest.song}." Requested by @${nextRequest.requester}.`;
      if (!nextRequest) outputMessage.message = "Queue is empty!";
      return sendChatMessage(outputMessage);
    },
  },
  {
    name: "queue",
    description: "Says up to the next 5 songs in chat",
    execute(outputMessage: OutputMessage) {
      const queueLength = songQueue.getLength();
      if (queueLength === 0) {
        outputMessage.message = `The queue is empty!`;
        return sendChatMessage(outputMessage);
      }
      const count = Math.min(5, queueLength);
      const topSongs = songQueue.topSongs(count);
      const nextSongList = topSongs
        .map((request, i) => `${i + 1}. ${request.song}`)
        .join(", ");

      outputMessage.message = `${queueLength} songs in request queue: ${nextSongList}`;
      return sendChatMessage(outputMessage);
    },
  },
  {
    name: "current",
    description: "Says the current song",
    execute(outputMessage: OutputMessage) {
      const song = songQueue.current();
      if (song) {
        outputMessage.message = `Current song song is: ${song}`;
        sendChatMessage(outputMessage);
      }
    },
  },
  {
    name: "previous",
    description: "Says the previous song",
    execute(outputMessage: OutputMessage) {
      const song = songQueue.previous();
      if (song) {
        outputMessage.message = `Previous song was: ${song}`;
        sendChatMessage(outputMessage);
      }
    },
  },
  {
    name: "remove",
    description: "(Mods only) Removes a song from the queue",
    execute(outputMessage: OutputMessage, input: string) {
      const inputStr = input.split(" ").splice(1).join(" ");
      outputMessage.message =
        '(Mods only) "!remove #" where # is the position in the queue or "!remove last" to remove the last song added';
      if (!inputStr) {
        return sendChatMessage(outputMessage);
      }
      let index = -1;
      if (inputStr.toLowerCase() === "last") {
        index = songQueue.getLength() - 1;
      } else {
        index = parseInt(inputStr, 10) - 1;
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
        outputMessage.message = `${removedSong.song} was removed`;
      }
      return sendChatMessage(outputMessage);
    },
  },
];

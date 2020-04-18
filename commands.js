module.exports = function (songQueue) {
  return {
    nextSong,
    queue,
    currentSong,
    previousSong,
    sendChatMessage,
    removeSong,
  };

  function nextSong(chat, channel) {
    const nextRequest = songQueue.peek();
    if (!nextRequest) return sendChatMessage(chat, channel, `Queue is empty!`);
    return sendChatMessage(
      chat,
      channel,
      `Next song: "${nextRequest.song}." Requested by @${nextRequest.requester}.`,
    );
  }

  function queue(chat, channel) {
    const queueLength = songQueue.getLength();
    if (queueLength === 0) {
      return sendChatMessage(chat, channel, `The queue is empty!`);
    }
    let count = 5;
    if (queueLength < 5) count = queueLength;
    const topSongs = songQueue.topSongs(count);
    let i = 0;
    const nextSongList = topSongs
      .map((request) => {
        i++;
        return `${i}. ${request.song}`;
      })
      .join(", ");

    return sendChatMessage(
      chat,
      channel,
      `${queueLength} songs in request queue: ${nextSongList}`,
    );
  }

  function currentSong(chat, channel) {
    const song = songQueue.current();
    if (song) {
      sendChatMessage(chat, channel, `Current song song is: ${song}`);
    }
  }

  function previousSong(chat, channel) {
    const song = songQueue.previous();
    if (song) {
      sendChatMessage(chat, channel, `Previous song was: ${song}`);
    }
  }

  function removeSong(chat, channel, message) {
    const entryStr = message.split(" ").splice(1).join(" ");
    let response =
      '(Mods only) "!remove #" where # is the position in the queue or "!remove last" to remove the last song added';
    if (!entryStr) {
      return sendChatMessage(chat, channel, `${response}`);
    }
    let index = -1;
    if (entryStr.toLowerCase() === "last") {
      index = songQueue.getLength() - 1;
    } else {
      index = parseInt(entryStr, 10) - 1;
    }

    if (songQueue.isEmpty()) {
      response = "Queue is already empty";
    } else if (isNaN(index) || index < 0) {
      response = "Not a valid number";
    } else if (songQueue.getLength() < index + 1) {
      response = "Not that many songs in the queue. Check with !queue";
    } else {
      const removedSong = songQueue.removeSong(index);
      response = `${removedSong.song} was removed`;
    }
    return sendChatMessage(chat, channel, `${response}`);
  }

  function sendChatMessage(chat, channel, message) {
    chat.say(channel, message).catch((error) => {
      console.error(error);
    });
  }
};

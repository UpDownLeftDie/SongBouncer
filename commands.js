module.exports = function(songQueue) {
  return {
    nextSong,
    queue,
    currentSong,
    previousSong,
    sendChatMessage
  };

  function nextSong(chat, channel) {
    const nextRequest = songQueue.peek();
    if (!nextRequest) return sendChatMessage(chat, channel, `Queue is empty!`);
    return sendChatMessage(
      chat,
      channel,
      `Next song: "${nextRequest.song}." Requested by @${nextRequest.requester}.`
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
      .map(request => {
        i++;
        return `${i}. ${request.song}`;
      })
      .join(", ");

    return sendChatMessage(
      chat,
      channel,
      `There are ${queueLength} requests. The next ${count} songs are: ${nextSongList}`
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

  function sendChatMessage(chat, channel, message) {
    chat.say(channel, message).catch(error => {
      console.error(error);
    });
  }
};

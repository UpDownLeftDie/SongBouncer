module.exports = function(songQueue) {
    return {
        nextSong,
        queue,
        currentSong,
        previousSong,
        sendChatMessage
    };

    function nextSong(client, channel) {
        const nextRequest = songQueue.peek();
        if (!nextRequest) return sendChatMessage(client, channel, `Queue is empty!`);
        return sendChatMessage(client, channel, `Next song: "${nextRequest.song}." Requested by @${nextRequest.requester}.`)
    }

    function queue(client, channel) {
        const queueLength = songQueue.getLength();
        if (queueLength === 0) {
            return sendChatMessage(client, channel, `The queue is empty!`);
        }
        let count = 5;
        if (queueLength < 5) count = queueLength;
        const topSongs = songQueue.topSongs(count);
        let i = 0;
        const nextSongList = topSongs.map(request => {
            i++;
            return `${i}. ${request.song}`
        }).join(', ');
        
        return sendChatMessage(client, channel, `There are ${queueLength} requests. The next ${count} songs are: ${nextSongList}`);
    }

    function currentSong(client, channel) {
        const song = songQueue.current();
        if (song) {
            sendChatMessage(client, channel, `Current song song is: ${song}`);
        }
    }

    function previousSong(client, channel) {
        const song = songQueue.previous();
        if (song) {
            sendChatMessage(client, channel, `Previous song was: ${song}`);
        }
    }

    function sendChatMessage(client, channel, message) {
        client.say(channel, message)
        .catch(error => {
            console.error(error);
        });
    }
};
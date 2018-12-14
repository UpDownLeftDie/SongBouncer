const _ = require('lodash');

class SongRequestQueue {
    constructor() {
        this.active = [];
    }

    isEmpty() {
        return this.active.length === 0;
    }

    getLength() {
        return this.active.length;
    }

    peek() {
        return _.get(this, 'active.[0]', undefined);
    };

    topSongs(count) {
        return this.active.slice(0, count);
    }

    enqueue(requester, song) {
        this.active.push({requester, song});
    };
    
    nextSong() {
        return this.active.shift();
    }
}

module.exports = SongRequestQueue;
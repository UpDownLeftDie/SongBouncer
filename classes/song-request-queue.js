const _ = require('lodash');

class SongRequestQueue {
    constructor() {
        this.active = [];
        this.inactive = [];
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

    swapArrays(fromArray, toArray, requester) {
        for (let i=0; i < fromArray.length; i++) {
            if (fromArray[i].requester.toLowerCase() === requester.toLowerCase()) {
                toArray.push(fromArray[i]);
                fromArray.splice(i, 1);
                i--;
            }
        }
    }

    userLeft(user) {
        this.swapArrays(this.active, this.inactive, user);
    }

    userReturned(user) {
        this.swapArrays(this.inactive, this.active, user);
    }

    updateQueues(currentUsers) {
        currentUsers.forEach(user => {
            this.userReturned(user);
        });

        const previousUsers = this.active.map(request => request.requester);
        const leftUsers = previousUsers.filter(previousUser => {
            return currentUsers.indexOf(previousUser.toLowerCase()) < 0;
        });
        leftUsers.forEach(user => {
            this.userLeft(user); 
        });
    }
}

module.exports = SongRequestQueue;
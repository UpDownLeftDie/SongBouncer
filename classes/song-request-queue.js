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

    makeRequestList(array) {
        let list = '';
        for (let i = 0; i < array.length; i++) {
            list += `	${i + 1}. ${array[i].song}  (requested by: ${array[i].requester})\n`
        }
        if (!list.length) list = '	N/A\n';
        return list;
    }

    printTerminal() {
        let nextSongStr = 'N/A';
        if (this.peek()) nextSongStr = `${this.peek().song}  (requested by: ${this.peek().requester})`;
        process.stdout.write('\x1Bc');
        console.log(`
Inactive Queue:
${this.makeRequestList(this.inactive)}
Active Queue:
${this.makeRequestList(this.active)}

Next Song: ${nextSongStr}
Press (n) for the next song
        `);
    }

    enqueue(requester, song) {
        this.active.push({requester, song});
        this.printTerminal();
    };
    
    nextSong() {
        const song = this.active.shift();
        this.printTerminal();
        return song;
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
        this.printTerminal();
    }
}

module.exports = SongRequestQueue;
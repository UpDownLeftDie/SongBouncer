const _ = require('lodash');

class SongRequestQueue {
    constructor() {
        this.active = [{requester: 'a', song: 'test'},{requester: 'myaubot', song: 'meow'}];
        this.inactive = [{requester: 'buttsbot', song: 'buttsong'}];
        this.currentSong = '';
        this.lastSong = '';
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

    formatRequest(request) {
        console.log(request);
        if (!request) return 'N/A';
        return `${request.song}  (${request.requester})`;
    }

    makeRequestList(array) {
        let list = '';
        for (let i = 0; i < array.length; i++) {
            list += `	${i + 1}. ${this.formatRequest(array[i])})\n`
        }
        if (!list.length) list = '	N/A\n';
        return list;
    }

    printTerminal() {
        let nextSongStr = `${this.formatRequest(this.peek())}`;
        process.stdout.write('\x1Bc');
        console.log(`Inactive Queue:\n` +
            `${this.makeRequestList(this.inactive)}` +
            `\nActive Queue:\n` +
            `${this.makeRequestList(this.active)}` +
            `\n\nNext Song: ${nextSongStr}` +
            `\nLast Song: ${this.formatRequest(this.lastSong)}` +
            `\n\nCurrent song: ${this.formatRequest(this.currentSong)}` +
            `\nPress (n) for the next song`
        );
    }

    enqueue(requester, song) {
        this.active.push({requester, song});
        this.printTerminal();
    };
    
    nextSong() {
        const song = this.active.shift();
        this.lastSong = this.currentSong;
        this.currentSong = song;
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
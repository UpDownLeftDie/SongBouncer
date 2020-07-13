import { ISongRequest, ISongQueue } from "../interfaces/ISong";

class SongQueue {
  active: ISongQueue;
  inactive: ISongQueue;
  currentSong: ISongRequest;
  previousSong: ISongRequest;

  constructor() {
    this.active = [];
    this.inactive = [];
    this.currentSong = undefined;
    this.previousSong = undefined;
  }

  isEmpty(): boolean {
    return this.active.length === 0;
  }

  getLength(): number {
    return this.active.length;
  }

  peek(): ISongRequest | undefined {
    return this?.active?.[0];
  }

  previous(): string {
    return this?.previousSong?.song;
  }

  current(): string {
    return this?.currentSong?.song;
  }

  topSongs(count: number): ISongQueue {
    return this.active.slice(0, count);
  }

  removeSong(index: number): ISongRequest {
    const removedSong = this.active[index];
    this.active = [].concat(
      this.active.slice(0, index),
      this.active.slice(index + 1),
    );
    this.printTerminal();
    return removedSong;
  }

  formatRequest(request: ISongRequest): string {
    if (!request) return "N/A";
    // TODO handle this better so its not ugly JSON
    return JSON.stringify(request);
  }

  printQueue(queue: ISongQueue, name: string): void {
    console.log(`${name} Queue`);
    const adjusted = queue.reduce((acc, request, i) => {
      acc[i + 1] = request;
      return acc;
    }, {});
    console.table(adjusted);
  }

  printTerminal(): void {
    process.stdout.write("\x1Bc");
    this.printQueue(this.inactive, "Inactive");
    this.printQueue(this.active, "Active");
    console.log(`\n\nPrevious Song: ${this.formatRequest(this.previousSong)}`);
    console.log(
      "\x1b[31m%s\x1b[0m",
      `Current song: ${this.formatRequest(this.currentSong)}`,
    );
    const nextSongStr = `${this.formatRequest(this.peek())}`;
    console.log(
      `Next Song: ${nextSongStr}` + `\n\nPress (n) for the next song`,
    );
  }

  enqueue(queueObject: ISongRequest): number {
    this.active.push(queueObject);
    this.printTerminal();
    return this.getLength();
  }

  nextSong(): ISongRequest {
    const song: ISongRequest = this.active.shift();
    this.previousSong = this.currentSong || this.previousSong;
    this.currentSong = song;
    this.printTerminal();
    return song;
  }

  swapArrays(
    fromArray: ISongQueue,
    toArray: ISongQueue,
    requester: string,
  ): void {
    for (let i = 0; i < fromArray.length; i++) {
      if (fromArray[i].requester.toLowerCase() === requester.toLowerCase()) {
        toArray.push(fromArray[i]);
        fromArray.splice(i, 1);
        i--;
      }
    }
  }

  userLeft(user: string): void {
    this.swapArrays(this.active, this.inactive, user);
  }

  userReturned(user: string): void {
    this.swapArrays(this.inactive, this.active, user);
  }

  updateQueues(currentUsers: string[]): void {
    currentUsers.forEach((user) => {
      this.userReturned(user);
    });

    const previousUsers = this.active.map((request) => request.requester);
    const leftUsers = previousUsers.filter((previousUser) => {
      return currentUsers.indexOf(previousUser.toLowerCase()) < 0;
    });
    leftUsers.forEach((user) => {
      this.userLeft(user);
    });
    this.printTerminal();
  }
}

export default new SongQueue();

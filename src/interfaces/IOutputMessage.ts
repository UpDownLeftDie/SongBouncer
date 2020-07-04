import { Client, ChatUserstate } from "tmi.js";

export default interface IOutputMessage {
  userstate?: ChatUserstate;
  client: Client;
  channelId: string;
  message: string;
}

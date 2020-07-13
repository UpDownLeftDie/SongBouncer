import { Client, ChatUserstate } from "tmi.js";

export interface IInputMessage {
  userstate: ChatUserstate;
  client: Client;
  channel: string;
  message: string;
}

export interface IOutputMessage {
  userstate?: ChatUserstate;
  client: Client;
  channel: string;
  message: string;
}

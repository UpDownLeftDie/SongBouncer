import { Chat } from "twitch-js";

export default interface IOutputMessage {
  chat: Chat;
  channelId: string;
  message: string;
}

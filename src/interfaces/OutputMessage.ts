import { Chat } from "twitch-js";

export default interface OutputMessage {
  chat: Chat;
  channel?: string;
  channels?: Map<string, string>;
  message: string;
}

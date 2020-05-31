export type ICommands = Map<string, ICommand>;

export interface ICommand {
  name: string;
  description: string;
  execute: Function;
}

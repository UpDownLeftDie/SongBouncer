export type ICommands = Map<string, ICommand>;

export interface IPermissions {
  follower?: boolean;
  mod?: boolean;
  subscriber?: boolean;
  broadcaster?: boolean;
}

export interface ICommand {
  name: string;
  description: string;
  execute: Function;
  permissions: IPermissions;
}

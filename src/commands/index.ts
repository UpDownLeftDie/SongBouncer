import { ICommand } from "../interfaces/ICommand";
import base from "./base";
import beatsaber from "./beatsaber";

module.exports = (commandModules) => {
  let commands: Array<any> = base;
  Object.entries(commandModules).forEach(([commandModule, isEnabled]) => {
    if (isEnabled) {
      const name = commandModule.trim().toLowerCase();
      if (name === "beatsaber") {
        commands = commands.concat(beatsaber);
      }
    }
  });

  let commandMap = new Map();
  commands.forEach((command: ICommand) => {
    if (Array.isArray(command.name)) {
      command.name.forEach((name) => {
        commandMap.set(name, command);
      });
    } else {
      commandMap.set(command.name, command);
    }
  });

  return commandMap;
};

import base from "./base";
import beatsaber from "./beatsaber";
import twitchsings from "./twitchsings";

module.exports = (modules) => {
  let commands = base;
  Object.entries(modules).forEach(([module, isEnabled]) => {
    if (isEnabled) {
      const name = module.trim().toLowerCase();
      if (name === "beatsaber") {
        commands = commands.concat(beatsaber);
      } else if (name === "twitchsings") {
        commands = commands.concat(twitchsings);
      }
    }
  });

  let commandMap = new Map();
  commands.forEach((command) => {
    commandMap.set(command.name, command);
  });
  return commandMap;
};

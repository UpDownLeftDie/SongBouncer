import baseCommands from "../../commands/base";

test("remove is mod only", () => {
  const command = findCommand("remove");
  expect(command.name.indexOf("remove")).toBeGreaterThan(-1);
});

function findCommand(name: string) {
  return baseCommands.find((command) => {
    const commandNames: Array<string> = [command.name].flat(1);
    return commandNames.indexOf(name) > -1;
  });
}

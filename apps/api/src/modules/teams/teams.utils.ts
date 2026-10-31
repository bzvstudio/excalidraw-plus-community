export class UnknownTeam extends Error {
  constructor() {
    super("No such team");
  }
}

export class TeamNameTaken extends Error {
  constructor(name: string) {
    super(`This workspace already has a team called "${name}"`);
  }
}

export class TeamInUse extends Error {
  constructor() {
    super("This team decides who can see a collection; change that collection's access before deleting it");
  }
}

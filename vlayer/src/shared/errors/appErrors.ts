export class AppError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}
export class AlreadyClaimedError extends AppError {
  constructor() {
    super(
      "AlreadyClaimedError",
      "Claim has already been made for this account.",
    );
  }
}

export class CallProverError extends AppError {
  constructor(message: string) {
    super("CallProverError", message);
  }
}

export class UseChainError extends AppError {
  constructor(message: string) {
    super("UseChainError", message);
  }
}

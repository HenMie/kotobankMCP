export class KotobankError extends Error {
  readonly code: string;

  constructor(code: string, message: string, cause?: unknown) {
    super(message, { cause });
    this.code = code;
    this.name = new.target.name;
  }
}

export class KotobankNetworkError extends KotobankError {
  constructor(message: string, cause?: unknown) {
    super("KOTOBANK_NETWORK_ERROR", message, cause);
  }
}

export class KotobankParseError extends KotobankError {
  constructor(message: string, cause?: unknown) {
    super("KOTOBANK_PARSE_ERROR", message, cause);
  }
}

export class KotobankNotFoundError extends KotobankError {
  constructor(message: string) {
    super("KOTOBANK_NOT_FOUND", message);
  }
}

export class KotobankDisambiguationError extends KotobankError {
  constructor(message: string) {
    super("KOTOBANK_DISAMBIGUATION_REQUIRED", message);
  }
}

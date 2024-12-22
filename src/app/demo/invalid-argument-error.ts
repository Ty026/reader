import { AIStubError } from "./ai-stub-error";

const name = "AI_InvalidArgumentError";
const marker = `ai.stub.error.${name}`;
const symbol = Symbol.for(marker);

export class InvalidArgumentError extends AIStubError {
  readonly [symbol] = true;

  readonly argument: string;

  constructor({
    message,
    cause,
    argument,
  }: {
    argument: string;
    message: string;
    cause?: unknown;
  }) {
    super({ name, message, cause });

    this.argument = argument;
  }

  static isInstance(error: unknown): error is InvalidArgumentError {
    return AIStubError.hasMarker(error, marker);
  }
}

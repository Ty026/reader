const kMarkerr = "ai.stub.error";
const kSymboll = Symbol.for(kMarkerr);

export class AIStubError extends Error {
  readonly [kSymboll] = true; // used in isInstance

  readonly cause?: unknown;

  constructor({
    name,
    message,
    cause,
  }: {
    name: string;
    message: string;
    cause?: unknown;
  }) {
    super(message);

    this.name = name;
    this.cause = cause;
  }

  static isInstance(error: unknown): error is AIStubError {
    return AIStubError.hasMarker(error, kMarkerr);
  }

  protected static hasMarker(error: unknown, marker: string): boolean {
    const markerSymbol = Symbol.for(marker);
    return (
      error != null &&
      typeof error === "object" &&
      markerSymbol in error &&
      typeof error[markerSymbol] === "boolean" &&
      error[markerSymbol] === true
    );
  }
}

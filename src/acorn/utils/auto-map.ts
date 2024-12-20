export class AutoMap<T, U> extends Map<T, U> {
  defaultValue: () => U;

  constructor(
    defaultValue: () => U,
    ...rest: ConstructorParameters<typeof Map<T, U>>
  ) {
    super(...rest);
    this.defaultValue = defaultValue;
  }

  get(key: T): U {
    if (!this.has(key)) this.set(key, this.defaultValue());
    return super.get(key)!;
  }
}

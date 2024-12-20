import { objectEntries } from "../../utils/object-entries";
import { format } from "./format";

type Join<T extends any[], U extends string> = T extends [infer F, ...infer R]
  ? R["length"] extends 0
    ? `${F & string}`
    : `${F & string}${U}${Join<R, U>}`
  : never;

type Permutation<T, K = T> = [T] extends [never]
  ? []
  : K extends K
    ? [K, ...Permutation<Exclude<T, K>>]
    : never;

type WrapStringWithBracket<T extends string> = `{${T}}`;

export type StringTemplate<Var extends readonly string[]> =
  Var["length"] extends 0
    ? string
    : Var["length"] extends number
      ? number extends Var["length"]
        ? string
        : `${string}${Join<Permutation<WrapStringWithBracket<Var[number]>>, `${string}`>}${string}`
      : never;

export type PromptTemplateParams<
  T extends string[],
  U extends StringTemplate<T>,
> = {
  templateVars?: T | string[];
  template: U;
};

export class PromptTemplate<
  const T extends string[] = string[],
  const V extends string[] = string[],
  const U extends StringTemplate<T> = StringTemplate<T>,
> {
  protected templateVars: Set<string> = new Set();
  private template: U;

  constructor({ templateVars, template }: PromptTemplateParams<T, U>) {
    this.templateVars = new Set(templateVars);
    this.template = template;
  }

  format(context?: Partial<Record<T[number] | (string & {}), string>>) {
    const options = this.mapTemplateVars(context as Record<V[number], string>);
    const prompt = format(this.template, options);
    return prompt;
  }

  private mapTemplateVars(options: Record<T[number] | (string & {}), string>) {
    const result = {} as Record<T[number] | (string & {}), string>;
    return Object.fromEntries(
      objectEntries(options).map(([k, v]) => [result[k] || k, v]),
    );
  }
}

import { customAlphabet } from "nanoid/non-secure";
import { InvalidArgumentError } from "./invalid-argument-error";

export const createIdGenerator = ({
  prefix,
  size: defaultSize = 16,
  alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  separator = "-",
}: {
  prefix?: string;
  separator?: string;
  size?: number;
  alphabet?: string;
} = {}): ((size?: number) => string) => {
  const generator = customAlphabet(alphabet, defaultSize);
  if (prefix == null) return generator;

  if (alphabet.includes(separator)) {
    throw new InvalidArgumentError({
      argument: "separator",
      message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`,
    });
  }

  return (size) => `${prefix}${separator}${generator(size)}`;
};

export const generateId = createIdGenerator();

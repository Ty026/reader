import { JSONValue, LanguageModelFinishReason } from "./types";

export interface DataStreamPart<
  CODE extends string,
  NAME extends string,
  TYPE,
> {
  code: CODE;
  name: NAME;
  parse: (value: JSONValue) => { type: NAME; value: TYPE };
}

const textStreamPart: DataStreamPart<"0", "text", string> = {
  code: "0",
  name: "text",
  parse: (value: JSONValue) => {
    if (typeof value !== "string") {
      throw new Error('"text" parts expect a string value.');
    }
    return { type: "text", value };
  },
};

const dataStreamPart: DataStreamPart<"2", "data", Array<JSONValue>> = {
  code: "2",
  name: "data",
  parse: (value: JSONValue) => {
    if (!Array.isArray(value)) {
      throw new Error('"data" parts expect an array value.');
    }

    return { type: "data", value };
  },
};

const errorStreamPart: DataStreamPart<"3", "error", string> = {
  code: "3",
  name: "error",
  parse: (value: JSONValue) => {
    if (typeof value !== "string") {
      throw new Error('"error" parts expect a string value.');
    }
    return { type: "error", value };
  },
};

const messageAnnotationsStreamPart: DataStreamPart<
  "8",
  "message_annotations",
  Array<JSONValue>
> = {
  code: "8",
  name: "message_annotations",
  parse: (value: JSONValue) => {
    if (!Array.isArray(value)) {
      throw new Error('"message_annotations" parts expect an array value.');
    }

    return { type: "message_annotations", value };
  },
};

const finishMessageStreamPart: DataStreamPart<
  "d",
  "finish_message",
  {
    finishReason: LanguageModelFinishReason;
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
  }
> = {
  code: "d",
  name: "finish_message",
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== "object" ||
      !("finishReason" in value) ||
      typeof value.finishReason !== "string"
    ) {
      throw new Error(
        '"finish_message" parts expect an object with a "finishReason" property.',
      );
    }

    const result: {
      finishReason: LanguageModelFinishReason;
      usage?: {
        promptTokens: number;
        completionTokens: number;
      };
    } = {
      finishReason: value.finishReason as LanguageModelFinishReason,
    };

    if (
      "usage" in value &&
      value.usage != null &&
      typeof value.usage === "object" &&
      "promptTokens" in value.usage &&
      "completionTokens" in value.usage
    ) {
      result.usage = {
        promptTokens:
          typeof value.usage.promptTokens === "number"
            ? value.usage.promptTokens
            : Number.NaN,
        completionTokens:
          typeof value.usage.completionTokens === "number"
            ? value.usage.completionTokens
            : Number.NaN,
      };
    }

    return {
      type: "finish_message",
      value: result,
    };
  },
};

const finishStepStreamPart: DataStreamPart<
  "e",
  "finish_step",
  {
    isContinued: boolean;
    finishReason: LanguageModelFinishReason;
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
  }
> = {
  code: "e",
  name: "finish_step",
  parse: (value: JSONValue) => {
    if (
      value == null ||
      typeof value !== "object" ||
      !("finishReason" in value) ||
      typeof value.finishReason !== "string"
    ) {
      throw new Error(
        '"finish_step" parts expect an object with a "finishReason" property.',
      );
    }

    const result: {
      isContinued: boolean;
      finishReason: LanguageModelFinishReason;
      usage?: {
        promptTokens: number;
        completionTokens: number;
      };
    } = {
      finishReason: value.finishReason as LanguageModelFinishReason,
      isContinued: false,
    };

    if (
      "usage" in value &&
      value.usage != null &&
      typeof value.usage === "object" &&
      "promptTokens" in value.usage &&
      "completionTokens" in value.usage
    ) {
      result.usage = {
        promptTokens:
          typeof value.usage.promptTokens === "number"
            ? value.usage.promptTokens
            : Number.NaN,
        completionTokens:
          typeof value.usage.completionTokens === "number"
            ? value.usage.completionTokens
            : Number.NaN,
      };
    }

    if ("isContinued" in value && typeof value.isContinued === "boolean") {
      result.isContinued = value.isContinued;
    }

    return {
      type: "finish_step",
      value: result,
    };
  },
};

export type DataStreamPartType =
  | ReturnType<typeof textStreamPart.parse>
  | ReturnType<typeof dataStreamPart.parse>
  | ReturnType<typeof errorStreamPart.parse>
  | ReturnType<typeof messageAnnotationsStreamPart.parse>
  | ReturnType<typeof finishMessageStreamPart.parse>
  | ReturnType<typeof finishStepStreamPart.parse>;

const dataStreamParts = [
  textStreamPart,
  dataStreamPart,
  errorStreamPart,
  messageAnnotationsStreamPart,
  finishMessageStreamPart,
  finishStepStreamPart,
] as const;

export const dataStreamPartsByCode = {
  [textStreamPart.code]: textStreamPart,
  [dataStreamPart.code]: dataStreamPart,
  [errorStreamPart.code]: errorStreamPart,
  [messageAnnotationsStreamPart.code]: messageAnnotationsStreamPart,
  [finishMessageStreamPart.code]: finishMessageStreamPart,
  [finishStepStreamPart.code]: finishStepStreamPart,
} as const;

export const validCodes = dataStreamParts.map((part) => part.code);

export const parseDataStreamPart = (line: string): DataStreamPartType => {
  const firstSeparatorIndex = line.indexOf(":");

  if (firstSeparatorIndex === -1) {
    throw new Error("Failed to parse stream string. No separator found.");
  }

  const prefix = line.slice(0, firstSeparatorIndex);

  if (!validCodes.includes(prefix as keyof typeof dataStreamPartsByCode)) {
    throw new Error(`Failed to parse stream string. Invalid code ${prefix}.`);
  }

  const code = prefix as keyof typeof dataStreamPartsByCode;

  const textValue = line.slice(firstSeparatorIndex + 1);
  const jsonValue: JSONValue = JSON.parse(textValue);

  return dataStreamPartsByCode[code].parse(jsonValue);
};

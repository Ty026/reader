import { DataStreamPartType, parseDataStreamPart } from "./data-stream-parts";
import { fromSSEResponse } from "./streaming";

// const kNewLinee = "\n".charCodeAt(0);
//
type ProcessDataStreamOptions = {
  stream: ReadableStream<Uint8Array>;
  onTextPart?: (
    streamPart: (DataStreamPartType & { type: "text" })["value"],
  ) => Promise<void> | void;

  onDataPart?: (
    streamPart: (DataStreamPartType & { type: "data" })["value"],
  ) => Promise<void> | void;

  onErrorPart?: (
    streamPart: (DataStreamPartType & { type: "error" })["value"],
  ) => Promise<void> | void;

  onMessageAnnotationsPart?: (
    streamPart: (DataStreamPartType & {
      type: "message_annotations";
    })["value"],
  ) => Promise<void> | void;
  onFinishMessagePart?: (
    streamPart: (DataStreamPartType & { type: "finish_message" })["value"],
  ) => Promise<void> | void;
  onFinishStepPart?: (
    streamPart: (DataStreamPartType & { type: "finish_step" })["value"],
  ) => Promise<void> | void;
};

export async function processDataStream({
  stream,
  onTextPart,
  // onDataPart,
  // onErrorPart,
  // onFinishStepPart,
  onFinishMessagePart,
  // onMessageAnnotationsPart,
}: ProcessDataStreamOptions) {
  const result = fromSSEResponse(stream);
  for await (const chunk of result) {
    const part = (chunk as any).data.content;
    onTextPart?.(part);
  }
  onFinishMessagePart?.({ finishReason: "stop" });
}

import type { Pack } from "../api/chat/messager";
export class MessageBuilder {
  pack!: Pack<"text">;
  lastOperation: string | null = null;
  lastPath: string | null = null;

  get message() {
    return this.pack?.["message"];
  }

  private setValueAtPath(path?: string, value?: any) {
    const pathArray = path?.split("/").filter(Boolean) || [];
    let target = this.pack as any;
    for (let i = 0; i < pathArray.length - 1; i++) {
      target = target[pathArray[i]];
    }
    const lastKey = pathArray[pathArray.length - 1];
    target[lastKey] = value;
  }

  update(data: { o?: string; v: any; p?: string }) {
    // FIXME: we need a robust custom json-patch implementation
    if (data.o === "add" && !data.p && "message" in data.v) {
      this.pack = data.v as Pack<"text">;
      return;
    }

    const op = data.o || this.lastOperation;
    const path = data.p || this.lastPath;

    if (data.o) this.lastOperation = op;
    if (data.p) this.lastPath = path;

    switch (op) {
      case "append": {
        // TODO: other types
        if (typeof data.v !== "string") return;
        const pathArray = path?.split("/").filter(Boolean) || [];
        let target = this.pack as any;
        for (let i = 0; i < pathArray.length - 1; i++) {
          target = target[pathArray[i]];
        }
        const lastKey = pathArray[pathArray.length - 1];
        if (Array.isArray(target[lastKey])) {
          target[lastKey].push(data.v);
        } else {
          target[lastKey] += data.v;
        }
        break;
      }
      case "add": {
        // Maybe we don't need to do anything here
        break;
      }
      case "replace": {
        if (path) this.setValueAtPath(path, data.v);
        break;
      }
      case "patch": {
        if (Array.isArray(data.v)) {
          data.v.forEach((patch) => {
            const patchPath = patch.p;
            switch (patch.o) {
              case "replace":
              case "add":
                this.setValueAtPath(patchPath, patch.v);
                break;
            }
          });
        }
        break;
      }
    }
  }
}

// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import {
  MAX_CHAT_ATTACHMENT_BYTES,
  prepareChatAttachment,
} from "./prepareChatAttachment";

describe("prepareChatAttachment", () => {
  it("keeps a supported non-image attachment unchanged", async () => {
    const file = new File(["report"], "report.txt", { type: "text/plain" });

    await expect(prepareChatAttachment(file)).resolves.toEqual({
      blob: file,
      mimeType: "text/plain",
    });
  });

  it("rejects a non-image attachment above the upload limit", async () => {
    const file = new File(
      [new Uint8Array(MAX_CHAT_ATTACHMENT_BYTES + 1)],
      "large.bin",
      { type: "application/octet-stream" },
    );

    await expect(prepareChatAttachment(file)).rejects.toThrow(
      "Attachments must be 1.0 MB or smaller.",
    );
  });

  it("re-encodes a resized PNG that is still over the upload limit as WebP", async () => {
    vi.stubGlobal("createImageBitmap", async () => ({ width: 4000, height: 3000, close() {} }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage() {} } as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) =>
      callback({ size: type === "image/png" ? MAX_CHAT_ATTACHMENT_BYTES + 1 : 1, type } as Blob));
    const file = new File(["png"], "photo.png", { type: "image/png" });

    await expect(prepareChatAttachment(file)).resolves.toMatchObject({ mimeType: "image/webp" });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

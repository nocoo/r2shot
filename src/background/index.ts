import { handleMessage } from "./message-handler";
import type { ExtensionRequest } from "../types/messages";

chrome.runtime.onMessage.addListener(
  (request: ExtensionRequest, _sender, sendResponse) => {
    handleMessage(request).then(sendResponse);
    return true; // keep message channel open for async response
  },
);

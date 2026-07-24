import type { ExtensionRequest } from "../types/messages";
import { handleMessage } from "./message-handler";

chrome.runtime.onMessage.addListener(
  (request: ExtensionRequest, _sender, sendResponse) => {
    handleMessage(request).then(sendResponse);
    return true; // keep message channel open for async response
  },
);

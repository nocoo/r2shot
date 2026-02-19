export type MessageType = "CAPTURE_AND_UPLOAD" | "VERIFY_CONNECTION";

export interface CaptureAndUploadRequest {
  type: "CAPTURE_AND_UPLOAD";
}

export interface VerifyConnectionRequest {
  type: "VERIFY_CONNECTION";
}

export type ExtensionRequest = CaptureAndUploadRequest | VerifyConnectionRequest;

export interface SuccessResponse {
  success: true;
  url: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface ConnectionSuccessResponse {
  success: true;
}

export interface ConnectionErrorResponse {
  success: false;
  error: string;
}

export type CaptureResponse = SuccessResponse | ErrorResponse;
export type ConnectionResponse =
  | ConnectionSuccessResponse
  | ConnectionErrorResponse;

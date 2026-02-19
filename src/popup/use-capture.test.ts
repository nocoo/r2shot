import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCaptureAndUpload } from "./use-capture";

const mockSendMessage = vi.fn();
vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: mockSendMessage,
  },
});

describe("useCaptureAndUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should start in idle state", () => {
    const { result } = renderHook(() => useCaptureAndUpload());

    expect(result.current.status).toBe("idle");
    expect(result.current.url).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should transition to capturing state when capture is triggered", async () => {
    mockSendMessage.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    const { result } = renderHook(() => useCaptureAndUpload());

    act(() => {
      result.current.capture();
    });

    expect(result.current.status).toBe("capturing");
  });

  it("should transition to success state with URL on success", async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/2026-02-19/abc.jpg",
    });

    const { result } = renderHook(() => useCaptureAndUpload());

    await act(async () => {
      await result.current.capture();
    });

    expect(result.current.status).toBe("success");
    expect(result.current.url).toBe(
      "https://cdn.example.com/2026-02-19/abc.jpg",
    );
    expect(result.current.error).toBeNull();
  });

  it("should transition to error state on failure", async () => {
    mockSendMessage.mockResolvedValue({
      success: false,
      error: "Network error",
    });

    const { result } = renderHook(() => useCaptureAndUpload());

    await act(async () => {
      await result.current.capture();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network error");
    expect(result.current.url).toBeNull();
  });

  it("should handle chrome.runtime.sendMessage throwing", async () => {
    mockSendMessage.mockRejectedValue(new Error("Extension context invalidated"));

    const { result } = renderHook(() => useCaptureAndUpload());

    await act(async () => {
      await result.current.capture();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Extension context invalidated");
  });

  it("should reset state when reset is called", async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/test.jpg",
    });

    const { result } = renderHook(() => useCaptureAndUpload());

    await act(async () => {
      await result.current.capture();
    });

    expect(result.current.status).toBe("success");

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.url).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

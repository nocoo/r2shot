import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Popup } from "./Popup";

const mockSendMessage = vi.fn();
vi.stubGlobal("chrome", {
  runtime: {
    sendMessage: mockSendMessage,
    openOptionsPage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
});

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

describe("Popup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render brand name R2Shot", () => {
    render(<Popup />);
    expect(screen.getByText("R2Shot")).toBeInTheDocument();
  });

  it("should render capture button in idle state", () => {
    render(<Popup />);
    const btn = screen.getByRole("button", { name: /capture/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it("should render settings link", () => {
    render(<Popup />);
    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    expect(settingsBtn).toBeInTheDocument();
  });

  it("should open settings page when settings button is clicked", () => {
    render(<Popup />);
    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(settingsBtn);
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it("should show loading state during capture", async () => {
    mockSendMessage.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );

    render(<Popup />);
    const btn = screen.getByRole("button", { name: /capture/i });
    fireEvent.click(btn);

    expect(screen.getByText(/capturing/i)).toBeInTheDocument();
  });

  it("should show URL and copy button on success", async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/2026-02-19/abc.jpg",
    });

    render(<Popup />);
    fireEvent.click(screen.getByRole("button", { name: /capture/i }));

    await waitFor(() => {
      expect(screen.getByText(/cdn\.example\.com/)).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole("button", { name: /copy/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it("should copy URL to clipboard when copy button is clicked", async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/2026-02-19/abc.jpg",
    });

    render(<Popup />);
    fireEvent.click(screen.getByRole("button", { name: /capture/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(mockWriteText).toHaveBeenCalledWith(
      "https://cdn.example.com/2026-02-19/abc.jpg",
    );
  });

  it("should show error message on failure", async () => {
    mockSendMessage.mockResolvedValue({
      success: false,
      error: "Config not set",
    });

    render(<Popup />);
    fireEvent.click(screen.getByRole("button", { name: /capture/i }));

    await waitFor(() => {
      expect(screen.getByText(/config not set/i)).toBeInTheDocument();
    });
  });

  it("should allow retry after error", async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: false,
      error: "First error",
    });

    render(<Popup />);
    fireEvent.click(screen.getByRole("button", { name: /capture/i }));

    await waitFor(() => {
      expect(screen.getByText(/first error/i)).toBeInTheDocument();
    });

    // Should be able to try again
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it("should render logo in header", () => {
    render(<Popup />);
    const logo = screen.getByAltText("R2Shot logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/icons/logo32.png");
  });

  it("should show copied toast after clicking copy", async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/2026-02-19/abc.jpg",
    });

    render(<Popup />);
    fireEvent.click(screen.getByRole("button", { name: /capture/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    await waitFor(() => {
      expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
    });
  });

  it("should auto-dismiss copied toast after 2 seconds", async () => {
    vi.useFakeTimers();

    mockSendMessage.mockResolvedValue({
      success: true,
      url: "https://cdn.example.com/2026-02-19/abc.jpg",
    });

    render(<Popup />);

    // Trigger capture and wait for success
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /capture/i }));
      await vi.runAllTimersAsync();
    });

    // Click copy
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    });

    expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();

    // Advance past the 2s timeout
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      screen.queryByText(/copied to clipboard/i),
    ).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

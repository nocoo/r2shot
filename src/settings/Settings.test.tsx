import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Settings } from "./Settings";

const mockStorage: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStorage) result[key] = mockStorage[key];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
  },
});

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  });

  it("should render settings page title", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText("R2Shot Settings")).toBeInTheDocument();
    });
  });

  it("should render all config input fields", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/access key id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/secret access key/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bucket name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cdn url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jpg quality/i)).toBeInTheDocument();
    });
  });

  it("should render save button", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save/i }),
      ).toBeInTheDocument();
    });
  });

  it("should render test connection button", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /test connection/i }),
      ).toBeInTheDocument();
    });
  });

  it("should update input value when typing", async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/endpoint url/i) as HTMLInputElement;
    fireEvent.change(input, {
      target: { value: "https://abc.r2.cloudflarestorage.com" },
    });

    expect(input.value).toBe("https://abc.r2.cloudflarestorage.com");
  });

  it("should show validation errors when saving empty config", async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /save/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/endpoint url is required/i),
      ).toBeInTheDocument();
    });
  });

  it("should show success message after saving valid config", async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/endpoint url/i)).toBeInTheDocument();
    });

    // Fill in all required fields
    fireEvent.change(screen.getByLabelText(/endpoint url/i), {
      target: { value: "https://abc.r2.cloudflarestorage.com" },
    });
    fireEvent.change(screen.getByLabelText(/access key id/i), {
      target: { value: "test-key" },
    });
    fireEvent.change(screen.getByLabelText(/secret access key/i), {
      target: { value: "test-secret" },
    });
    fireEvent.change(screen.getByLabelText(/bucket name/i), {
      target: { value: "test-bucket" },
    });
    fireEvent.change(screen.getByLabelText(/cdn url/i), {
      target: { value: "https://cdn.test.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it("should render theme selector", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/theme/i)).toBeInTheDocument();
    });
  });
});

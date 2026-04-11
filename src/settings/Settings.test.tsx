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
    getManifest: () => ({ version: "0.1.0" }),
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
      expect(screen.getByLabelText(/custom domain/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText(/custom domain/i), {
      target: { value: "cdn.test.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it("should render theme buttons", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /light/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /dark/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /system/i }),
      ).toBeInTheDocument();
    });
  });

  it("should render logo in header", async () => {
    render(<Settings />);
    await waitFor(() => {
      const logo = screen.getByAltText("R2Shot logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/icons/logo64.png");
    });
  });

  it("should display version number in footer", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByText(/R2Shot v0\.1\.0/)).toBeInTheDocument();
    });
  });

  it("should show loading state initially", async () => {
    // Mock storage to hang so loading stays true
    let resolveGet: (v: Record<string, unknown>) => void;
    vi.mocked(chrome.storage.local.get).mockImplementationOnce(
      () => new Promise((r) => { resolveGet = r; }),
    );

    const { unmount } = render(<Settings />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Resolve to unblock cleanup, then unmount
    resolveGet!({});
    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
    unmount();
  });

  it("should show connection success message after test connection", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
      success: true,
    });

    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /test connection/i }),
      ).toBeInTheDocument();
    });

    // Fill required fields so config is valid
    fireEvent.change(screen.getByLabelText(/endpoint url/i), {
      target: { value: "https://abc.r2.cloudflarestorage.com" },
    });
    fireEvent.change(screen.getByLabelText(/access key id/i), {
      target: { value: "key" },
    });
    fireEvent.change(screen.getByLabelText(/secret access key/i), {
      target: { value: "secret" },
    });
    fireEvent.change(screen.getByLabelText(/bucket name/i), {
      target: { value: "bucket" },
    });
    fireEvent.change(screen.getByLabelText(/custom domain/i), {
      target: { value: "cdn.test.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => {
      expect(screen.getByText("Connection successful!")).toBeInTheDocument();
    });
  });

  it("should show connection error message on failed test", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
      success: false,
      error: "Bucket not found",
    });

    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /test connection/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Connection failed: Bucket not found/),
      ).toBeInTheDocument();
    });
  });

  it("should show error when test connection throws", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(
      new Error("Network error"),
    );

    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /test connection/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Connection failed: Network error/),
      ).toBeInTheDocument();
    });
  });

  it("should show error when test connection throws non-Error", async () => {
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(
      "something went wrong",
    );

    render(<Settings />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /test connection/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /test connection/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Connection failed: Connection test failed/),
      ).toBeInTheDocument();
    });
  });

  it("should update jpgQuality when changing the input", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/jpg quality/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/jpg quality/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "75" } });
    expect(input.value).toBe("75");
  });

  it("should default jpgQuality to 90 on invalid input", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/jpg quality/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/jpg quality/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("90");
  });

  it("should update maxScreens when changing the input", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/max screens/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/max screens/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "10" } });
    expect(input.value).toBe("10");
  });

  it("should default maxScreens to 5 on invalid input", async () => {
    render(<Settings />);
    await waitFor(() => {
      expect(screen.getByLabelText(/max screens/i)).toBeInTheDocument();
    });

    const input = screen.getByLabelText(/max screens/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("5");
  });
});

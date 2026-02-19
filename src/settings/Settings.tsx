import { useSettings } from "./use-settings";
import "../shared/index.css";

export function Settings() {
  const {
    config,
    loading,
    errors,
    saveStatus,
    connectionStatus,
    connectionError,
    updateField,
    save,
    testConnection,
  } = useSettings();

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">R2Shot Settings</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">R2Shot Settings</h1>

      {/* Theme */}
      <div className="mb-6">
        <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">
          Theme
        </label>
        <select
          id="theme"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          defaultValue="system"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>

      <hr className="my-6" />

      {/* R2 Configuration */}
      <h2 className="text-lg font-semibold mb-4">R2 Configuration</h2>

      <div className="space-y-4">
        <Field
          id="accountId"
          label="Account ID"
          value={config.accountId}
          error={errors.accountId}
          onChange={(v) => updateField("accountId", v)}
        />

        <Field
          id="accessKeyId"
          label="Access Key ID"
          value={config.accessKeyId}
          error={errors.accessKeyId}
          onChange={(v) => updateField("accessKeyId", v)}
        />

        <Field
          id="secretAccessKey"
          label="Secret Access Key"
          value={config.secretAccessKey}
          error={errors.secretAccessKey}
          onChange={(v) => updateField("secretAccessKey", v)}
          type="password"
        />

        <Field
          id="bucketName"
          label="Bucket Name"
          value={config.bucketName}
          error={errors.bucketName}
          onChange={(v) => updateField("bucketName", v)}
        />

        <Field
          id="cdnUrl"
          label="CDN URL"
          value={config.cdnUrl}
          error={errors.cdnUrl}
          onChange={(v) => updateField("cdnUrl", v)}
          placeholder="https://cdn.example.com"
        />

        <div>
          <label
            htmlFor="jpgQuality"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            JPG Quality
          </label>
          <input
            id="jpgQuality"
            type="number"
            min={1}
            max={100}
            value={config.jpgQuality}
            onChange={(e) =>
              updateField("jpgQuality", parseInt(e.target.value, 10) || 90)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          {errors.jpgQuality && (
            <p className="text-sm text-red-600 mt-1">{errors.jpgQuality}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={save}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
        <button
          onClick={testConnection}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Test Connection
        </button>
      </div>

      {/* Status messages */}
      {saveStatus === "saved" && (
        <p className="mt-3 text-sm text-green-700">Settings saved!</p>
      )}

      {connectionStatus === "success" && (
        <p className="mt-3 text-sm text-green-700">Connection successful!</p>
      )}

      {connectionStatus === "error" && connectionError && (
        <p className="mt-3 text-sm text-red-700">
          Connection failed: {connectionError}
        </p>
      )}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  placeholder,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border rounded-lg ${
          error ? "border-red-500" : "border-gray-300"
        }`}
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

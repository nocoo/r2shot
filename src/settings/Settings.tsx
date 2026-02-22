import { useSettings } from "./use-settings";
import { useTheme, type Theme } from "../shared/use-theme";
import { Button } from "../shared/button";
import { Input } from "../shared/input";
import { Label } from "../shared/label";
import { cn } from "../shared/cn";
import { getVersion } from "../shared/version";
import {
  Save,
  PlugZap,
  Globe,
  Key,
  Lock,
  FolderOpen,
  Link,
  ImageIcon,
  Scan,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import "../shared/index.css";

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

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
  const { theme, changeTheme } = useTheme();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-lg mx-auto p-6 flex flex-col items-center gap-4 pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* Header with logo */}
        <div className="flex items-center gap-3">
          <img
            src="/icons/logo64.png"
            alt="R2Shot logo"
            className="h-10 w-10"
          />
          <h1 className="text-2xl font-bold">R2Shot Settings</h1>
        </div>

        {/* Theme card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <Label htmlFor="theme">Theme</Label>
          <div className="flex gap-2">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? "default" : "outline"}
                size="sm"
                onClick={() => changeTheme(value)}
                aria-label={label}
                className="flex-1"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* R2 Configuration card */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <h2 className="text-lg font-semibold">R2 Configuration</h2>

          <ConfigField
            id="endpoint"
            label="Endpoint URL"
            icon={<Globe className="h-4 w-4 text-muted-foreground" />}
            value={config.endpoint}
            error={errors.endpoint}
            onChange={(v) => updateField("endpoint", v)}
            placeholder="https://<account-id>.r2.cloudflarestorage.com"
          />

          <ConfigField
            id="accessKeyId"
            label="Access Key ID"
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            value={config.accessKeyId}
            error={errors.accessKeyId}
            onChange={(v) => updateField("accessKeyId", v)}
          />

          <ConfigField
            id="secretAccessKey"
            label="Secret Access Key"
            icon={<Lock className="h-4 w-4 text-muted-foreground" />}
            value={config.secretAccessKey}
            error={errors.secretAccessKey}
            onChange={(v) => updateField("secretAccessKey", v)}
            type="password"
          />

          <ConfigField
            id="bucketName"
            label="Bucket Name"
            icon={<FolderOpen className="h-4 w-4 text-muted-foreground" />}
            value={config.bucketName}
            error={errors.bucketName}
            onChange={(v) => updateField("bucketName", v)}
          />

          <ConfigField
            id="customDomain"
            label="Custom Domain"
            icon={<Link className="h-4 w-4 text-muted-foreground" />}
            value={config.customDomain}
            error={errors.customDomain}
            onChange={(v) => updateField("customDomain", v)}
            placeholder="cdn.example.com"
          />

          <div className="space-y-1.5">
            <Label htmlFor="jpgQuality" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              JPG Quality
            </Label>
            <Input
              id="jpgQuality"
              type="number"
              min={1}
              max={100}
              value={config.jpgQuality}
              onChange={(e) =>
                updateField("jpgQuality", parseInt(e.target.value, 10) || 90)
              }
              className={cn(errors.jpgQuality && "border-destructive")}
            />
            {errors.jpgQuality && (
              <p className="text-sm text-destructive">{errors.jpgQuality}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxScreens" className="flex items-center gap-2">
              <Scan className="h-4 w-4 text-muted-foreground" />
              Max Screens (Full Page)
            </Label>
            <Input
              id="maxScreens"
              type="number"
              min={1}
              max={100}
              value={config.maxScreens}
              onChange={(e) =>
                updateField("maxScreens", parseInt(e.target.value, 10) || 5)
              }
              className={cn(errors.maxScreens && "border-destructive")}
            />
            {errors.maxScreens && (
              <p className="text-sm text-destructive">{errors.maxScreens}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Maximum viewport heights to capture in full-page mode (1–100)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={testConnection}>
            <PlugZap className="h-4 w-4" />
            Test Connection
          </Button>
        </div>

        {/* Status messages */}
        {saveStatus === "saved" && (
          <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved!
          </div>
        )}

        {connectionStatus === "success" && (
          <div className="flex items-center gap-2 text-sm text-success bg-success/10 p-3 rounded-md">
            <CheckCircle2 className="h-4 w-4" />
            Connection successful!
          </div>
        )}

        {connectionStatus === "error" && connectionError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            <XCircle className="h-4 w-4" />
            Connection failed: {connectionError}
          </div>
        )}

        {/* Footer with version */}
        <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
          R2Shot v{getVersion()}
        </div>
      </div>
    </div>
  );
}

interface ConfigFieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}

function ConfigField({
  id,
  label,
  icon,
  value,
  error,
  onChange,
  type = "text",
  placeholder,
}: ConfigFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(error && "border-destructive")}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

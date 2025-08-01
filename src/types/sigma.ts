// Sigma plugin configuration types
export interface SigmaConfig {
  textControl?: string;
  config?: string;
  editMode?: boolean;
}

// Plugin settings interface
export interface PluginSettings {
  backgroundColor: string;
  textColor: string;
  transparentBackground: boolean;
  textAlignment: 'left' | 'center' | 'right' | 'justify';
}

// Sigma client interface (based on @sigmacomputing/plugin)
export interface SigmaClient {
  config: {
    set: (config: Record<string, unknown>) => void;
    configureEditorPanel: (config: Array<{
      name: string;
      type: string;
      source?: string;
      allowMultiple?: boolean;
      label?: string;
      defaultValue?: string;
    }>) => void;
  };
}

// Settings component props with proper client typing
export interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: PluginSettings;
  onSave: (settings: PluginSettings) => void;
  client: SigmaClient;
}

// Error handling types
export interface ConfigParseError {
  message: string;
  originalError: unknown;
}
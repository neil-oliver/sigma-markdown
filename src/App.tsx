import React, { useEffect, useState, useCallback } from 'react';
import { client, useConfig, useVariable } from '@sigmacomputing/plugin';
import ReactMarkdown from 'react-markdown';
import { Button } from './components/ui/button';
import { Settings as SettingsIcon } from 'lucide-react';
import Settings, { DEFAULT_SETTINGS } from './Settings';
import { 
  SigmaConfig, 
  PluginSettings, 
  ConfigParseError 
} from './types/sigma';
import './App.css';

// Configure the plugin editor panel
client.config.configureEditorPanel([
  { name: 'textControl', type: 'variable', label: 'Text Control (Markdown Source)' },
  { name: 'config', type: 'text', label: 'Settings Config (JSON)', defaultValue: "{}" },
  { name: 'editMode', type: 'toggle', label: 'Edit Mode' }
]);

const App: React.FC = (): React.JSX.Element => {
  const config: SigmaConfig = useConfig();
  const [markdownText] = useVariable(config.textControl || '');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);

  // Parse config JSON and load settings
  useEffect(() => {
    if (config.config?.trim()) {
      try {
        const parsedConfig = JSON.parse(config.config) as Partial<PluginSettings>;
        const newSettings: PluginSettings = { ...DEFAULT_SETTINGS, ...parsedConfig };
        setSettings(newSettings);
      } catch (err) {
        const error: ConfigParseError = {
          message: 'Invalid config JSON',
          originalError: err
        };
        console.error('Config parse error:', error);
        setSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
  }, [config.config]);

  const handleSettingsSave = useCallback((newSettings: PluginSettings): void => {
    setSettings(newSettings);
    setShowSettings(false);
  }, []);

  const handleShowSettings = useCallback((): void => {
    setShowSettings(true);
  }, []);

  const handleCloseSettings = useCallback((): void => {
    setShowSettings(false);
  }, []);

  // Get markdown text from the control
  const getMarkdownContent = useCallback((): string => {
    if (!markdownText) {
      return '';
    }

    // Handle different variable object structures from Sigma
    if (typeof markdownText === 'object') {
      // Try common Sigma variable properties
      if ((markdownText as any).value !== undefined) {
        return String((markdownText as any).value);
      } else if ((markdownText as any).defaultValue !== undefined) {
        return String((markdownText as any).defaultValue);
      }
    }

    return String(markdownText);
  }, [markdownText]);

  const markdownContent = getMarkdownContent();

  // Early return for missing text control
  if (!config.textControl) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-10"
        style={{ 
          backgroundColor: String(settings.backgroundColor) || 'white',
          color: String(settings.textColor) || 'black'
        }}
      >
        <div className="text-center max-w-xl">
          <h3 className="text-lg font-semibold mb-2">Markdown Display Plugin</h3>
          <p className="text-muted-foreground">Please select a text control to display markdown content.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{ 
        backgroundColor: String(settings.backgroundColor) || 'white',
        color: String(settings.textColor) || 'black'
      }}
    >
      {config.editMode && (
        <Button 
          className="absolute top-5 right-5 z-10 gap-2"
          onClick={handleShowSettings}
          size="sm"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Button>
      )}
      
      <div className="w-full h-screen p-5 box-border overflow-auto">
        <div className="max-w-4xl mx-auto">
          {markdownContent ? (
            <div className="prose prose-lg max-w-none markdown-content">
              <ReactMarkdown
                components={{
                  // Custom styling for markdown elements to inherit colors
                  h1: ({children, ...props}) => <h1 {...props} style={{color: String(settings.textColor)}}>{children}</h1>,
                  h2: ({children, ...props}) => <h2 {...props} style={{color: String(settings.textColor)}}>{children}</h2>,
                  h3: ({children, ...props}) => <h3 {...props} style={{color: String(settings.textColor)}}>{children}</h3>,
                  h4: ({children, ...props}) => <h4 {...props} style={{color: String(settings.textColor)}}>{children}</h4>,
                  h5: ({children, ...props}) => <h5 {...props} style={{color: String(settings.textColor)}}>{children}</h5>,
                  h6: ({children, ...props}) => <h6 {...props} style={{color: String(settings.textColor)}}>{children}</h6>,
                  p: ({children, ...props}) => <p {...props} style={{color: String(settings.textColor)}}>{children}</p>,
                  li: ({children, ...props}) => <li {...props} style={{color: String(settings.textColor)}}>{children}</li>,
                  blockquote: ({children, ...props}) => <blockquote {...props} style={{color: String(settings.textColor), borderLeftColor: String(settings.textColor)}}>{children}</blockquote>,
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-lg font-semibold mb-4">Markdown Display Plugin</h3>
              <p className="text-muted-foreground">
                The selected text control is empty or contains no markdown content.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Enter some markdown text in the connected control to see it rendered here.
              </p>
            </div>
          )}
        </div>
      </div>

      <Settings
        isOpen={showSettings}
        onClose={handleCloseSettings}
        currentSettings={settings}
        onSave={handleSettingsSave}
        client={client}
      />
    </div>
  );
};

export default App; 
import React, { useEffect, useState } from 'react';
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

// Separate component for variable connection that can be remounted
interface VariableConnectorProps {
  variableName: string;
  onMarkdownChange: (markdown: string) => void;
}

const VariableConnector: React.FC<VariableConnectorProps> = ({ variableName, onMarkdownChange }) => {
  const [markdownText] = useVariable(variableName);
  
  useEffect(() => {
    const extractMarkdownText = (text: any): string => {
      if (!text) return '';
      if (typeof text === 'string') return text;
      
      // Handle common object structures
      if (typeof text === 'object') {
        return String(text.defaultValue?.value ?? text.value ?? text.text ?? text.content ?? '');
      }
      
      return String(text);
    };
    
    const markdown = extractMarkdownText(markdownText);
    onMarkdownChange(markdown);
  }, [markdownText, onMarkdownChange]);
  
  return null; // This component only handles data, no rendering
};

// Configure the plugin editor panel
client.config.configureEditorPanel([
  { name: 'textControl', type: 'variable', label: 'Text Control (Markdown Source)' },
  { name: 'config', type: 'text', label: 'Settings Config (JSON)', defaultValue: "{}" },
  { name: 'editMode', type: 'toggle', label: 'Edit Mode' }
]);

const App: React.FC = (): React.JSX.Element => {
  const config: SigmaConfig = useConfig();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  
  // Handle markdown content updates from the variable connector
  const handleMarkdownChange = (markdown: string) => {
    setMarkdownContent(markdown);
  };

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

  // Update body background based on transparency setting
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    if (settings.transparentBackground) {
      // Make iframe truly transparent
      body.style.backgroundColor = 'transparent';
      html.style.backgroundColor = 'transparent';
      body.classList.add('transparent-mode');
    } else {
      // Restore original background
      body.style.backgroundColor = settings.backgroundColor;
      html.style.backgroundColor = settings.backgroundColor;
      body.classList.remove('transparent-mode');
    }

    // Cleanup function
    return () => {
      body.classList.remove('transparent-mode');
    };
  }, [settings.transparentBackground, settings.backgroundColor]);

  const handleSettingsSave = (newSettings: PluginSettings): void => {
    setSettings(newSettings);
    setShowSettings(false);
  };

  const handleShowSettings = (): void => {
    setShowSettings(true);
  };

  const handleCloseSettings = (): void => {
    setShowSettings(false);
  };

  // Get container classes based on content width setting
  const getContainerClasses = (): string => {
    let classes = '';
    
    // Handle content width
    switch (settings.contentWidth) {
      case 'full':
        classes += 'w-full';
        break;
      case 'wide':
        classes += 'max-w-7xl';
        break;
      case 'medium':
        classes += 'max-w-4xl';
        break;
      case 'narrow':
        classes += 'max-w-2xl';
        break;
      default:
        classes += 'w-full';
    }
    
    // Handle content alignment
    switch (settings.contentAlignment) {
      case 'center':
        classes += ' mx-auto';
        break;
      case 'right':
        classes += ' ml-auto';
        break;
      case 'left':
      default:
        // No additional classes needed for left alignment
        break;
    }
    
    return classes;
  };

  // Early return for missing text control
  if (!config.textControl) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-10"
        style={{ 
          backgroundColor: settings.transparentBackground ? 'transparent' : (String(settings.backgroundColor) || 'white'),
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
        backgroundColor: settings.transparentBackground ? 'transparent' : (String(settings.backgroundColor) || 'white'),
        color: String(settings.textColor) || 'black'
      }}
    >
      {/* Variable connector */}
      {config.textControl && (
        <VariableConnector
          variableName={config.textControl}
          onMarkdownChange={handleMarkdownChange}
        />
      )}
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
        <div className={getContainerClasses()}>
          {markdownContent ? (
            <div 
              className="prose prose-lg max-w-none markdown-content"
              style={{ textAlign: settings.textAlignment }}
            >
              <ReactMarkdown
                components={{
                  // Create a reusable styled component function
                  ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li'].reduce((acc, tag) => {
                    acc[tag] = ({children, ...props}: {children: React.ReactNode; [key: string]: any}) => 
                      React.createElement(tag, {
                        ...props, 
                        style: {
                          color: settings.textColor,
                          textAlign: settings.blockAlignment
                        }
                      }, children);
                    return acc;
                  }, {} as Record<string, React.ComponentType<any>>),
                  blockquote: ({children, ...props}) => (
                    <blockquote 
                      {...props} 
                      style={{
                        color: settings.textColor, 
                        borderLeftColor: settings.textColor,
                        textAlign: settings.blockAlignment
                      }}
                    >
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-20">
              <h3 className="text-lg font-semibold mb-4">Markdown Display Plugin</h3>
              <p className="text-muted-foreground">
                {config.textControl ? 
                  'The selected text control is empty or contains no markdown content.' :
                  'Please select a text control to display markdown content.'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {config.textControl ?
                  'Enter some markdown text in the connected control to see it rendered here.' :
                  'Use the configuration panel to connect a text control with markdown content.'
                }
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


import React, { useEffect, useState, useMemo } from 'react';
import { client, useConfig, useVariable } from '@sigmacomputing/plugin';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import { Button } from './components/ui/button';
import { Settings as SettingsIcon, Save, X } from 'lucide-react';
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
  { name: 'styleMode', type: 'toggle', label: 'Style Mode' },
  { name: 'editMode', type: 'toggle', label: 'Edit Mode' }
]);

const App: React.FC = (): React.JSX.Element => {
  const config: SigmaConfig = useConfig();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // Handle markdown content updates from the variable connector
  const handleMarkdownChange = (markdown: string) => {
    setMarkdownContent(markdown);
    // Update draft if we're in edit mode and don't have unsaved changes
    if (config.editMode && !hasUnsavedChanges) {
      setDraftContent(markdown);
    }
  };

  // Initialize draft content when entering edit mode
  useEffect(() => {
    if (config.editMode && !hasUnsavedChanges) {
      setDraftContent(markdownContent);
    }
  }, [config.editMode, markdownContent, hasUnsavedChanges]);

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

  const handleEditorChange = (value: string): void => {
    setDraftContent(value);
    setHasUnsavedChanges(true);
  };

  const handleSaveMarkdown = async (): Promise<void> => {
    try {
      // Update the Sigma variable with the new content
      if (config.textControl) {
        await client.config.setVariable(config.textControl, draftContent);
        setMarkdownContent(draftContent);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving markdown:', error);
    }
  };

  const handleCancelEdit = (): void => {
    setDraftContent(markdownContent);
    setHasUnsavedChanges(false);
  };

  // SimpleMDE configuration
  const editorOptions = useMemo(() => ({
    autofocus: true,
    spellChecker: false,
    toolbar: [
      'bold', 'italic', 'heading', '|',
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'code', 'table', '|',
      'undo', 'redo'
    ] as const,
    status: false,
    sideBySideFullscreen: false,
    previewRender: () => '', // Disable built-in preview
  }), []);

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
      {config.styleMode && (
        <Button 
          className="absolute top-5 right-5 z-10 gap-2"
          onClick={handleShowSettings}
          size="sm"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Button>
      )}
      
      {config.editMode ? (
        /* Edit Mode - Split View */
        <div className="w-full h-screen flex flex-col">
          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Markdown Editor</h3>
              {hasUnsavedChanges && (
                <span className="text-sm text-yellow-600">Unsaved changes</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelEdit}
                disabled={!hasUnsavedChanges}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveMarkdown}
                disabled={!hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Split View */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Pane */}
            <div className="w-1/2 border-r overflow-auto">
              <SimpleMDE
                value={draftContent}
                onChange={handleEditorChange}
                options={editorOptions}
              />
            </div>

            {/* Preview Pane */}
            <div className="w-1/2 overflow-auto p-5">
              <div className={getContainerClasses()}>
                {draftContent ? (
                  <div 
                    className="prose prose-lg max-w-none markdown-content"
                    style={{ textAlign: settings.textAlignment }}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
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
                      {draftContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <p className="text-muted-foreground">Start typing markdown to see preview...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode - Normal Preview */
        <div className="w-full h-screen p-5 box-border overflow-auto">
          <div className={getContainerClasses()}>
            {markdownContent ? (
              <div 
                className="prose prose-lg max-w-none markdown-content"
                style={{ textAlign: settings.textAlignment }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
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
      )}

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


import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { client, useConfig, useVariable } from '@sigmacomputing/plugin';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import { Button } from './components/ui/button';
import { 
  Settings as SettingsIcon, 
  Save, 
  X, 
  Columns2, 
  FileText, 
  Eye
} from 'lucide-react';
import Settings, { DEFAULT_SETTINGS } from './Settings';
import Onboarding from './Onboarding';
import { 
  SigmaConfig, 
  PluginSettings, 
  ConfigParseError 
} from './types/sigma';
import './App.css';

// Storage key for persisting content across reloads
const CONTENT_CACHE_KEY = 'sigma-markdown-content-cache';

// Try to restore cache from sessionStorage on module load
let globalContentCache = '';
try {
  const stored = sessionStorage.getItem(CONTENT_CACHE_KEY);
  if (stored) {
    globalContentCache = stored;
  }
} catch (e) {
  console.warn('Failed to restore cache from sessionStorage:', e);
}

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
  { name: 'mode', type: 'radio', label: 'Mode', values: ['preview', 'style', 'edit'], defaultValue: 'preview' }
]);

const App: React.FC = (): React.JSX.Element => {
  const config: SigmaConfig = useConfig();
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // Handle markdown content updates from the variable connector
  const handleMarkdownChange = useCallback((markdown: string) => {
    // Update global cache and persist to sessionStorage
    if (markdown) {
      globalContentCache = markdown;
      try {
        sessionStorage.setItem(CONTENT_CACHE_KEY, markdown);
      } catch (e) {
        console.warn('Failed to persist to sessionStorage:', e);
      }
    } else {
      // If cache is empty, try to restore from sessionStorage
      if (!globalContentCache) {
        try {
          const stored = sessionStorage.getItem(CONTENT_CACHE_KEY);
          if (stored) {
            globalContentCache = stored;
          }
        } catch (e) {
          console.warn('Failed to restore from sessionStorage:', e);
        }
      }
    }
    
    // Update state, using cache if markdown is empty
    const finalContent = markdown || globalContentCache;
    setMarkdownContent(finalContent);
    
    // Update draft if we're in edit mode and don't have unsaved changes
    if (config.mode === 'edit' && !hasUnsavedChanges) {
      setDraftContent(finalContent);
    }
  }, [config.mode, hasUnsavedChanges]);

  // Initialize draft content when entering edit mode
  useEffect(() => {
    if (config.mode === 'edit' && !hasUnsavedChanges) {
      const content = markdownContent || globalContentCache;
      setDraftContent(content);
    }
  }, [config.mode, markdownContent, hasUnsavedChanges]);

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

  const handleToggleViewMode = (mode: 'split' | 'editor' | 'preview'): void => {
    setSettings(prev => ({ ...prev, editorViewMode: mode }));
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

  // SimpleMDE configuration with custom Lucide icons
  const editorOptions = useMemo(() => ({
    autofocus: true,
    spellChecker: false,
    toolbar: [
      {
        name: 'bold',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`**${selection}**`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Bold',
      },
      {
        name: 'italic',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`*${selection}*`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Italic',
      },
      {
        name: 'heading',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`## ${selection}`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Heading',
      },
      '|' as const,
      {
        name: 'quote',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`> ${selection}`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Quote',
      },
      {
        name: 'unordered-list',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`- ${selection}`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Unordered List',
      },
      {
        name: 'ordered-list',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`1. ${selection}`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Ordered List',
      },
      '|' as const,
      {
        name: 'link',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`[${selection}](url)`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Link',
      },
      {
        name: 'image',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`![${selection}](url)`);
        },
        className: 'lucide-toolbar-icon',
        title: 'Image',
      },
      {
        name: 'code',
        action: (editor: any) => {
          const cm = editor.codemirror;
          const selection = cm.getSelection();
          cm.replaceSelection(`\`\`\`\n${selection}\n\`\`\``);
        },
        className: 'lucide-toolbar-icon',
        title: 'Code',
      },
      {
        name: 'table',
        action: (editor: any) => {
          const cm = editor.codemirror;
          cm.replaceSelection('| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |');
        },
        className: 'lucide-toolbar-icon',
        title: 'Table',
      },
      '|' as const,
      {
        name: 'undo',
        action: (editor: any) => {
          const cm = editor.codemirror;
          cm.undo();
        },
        className: 'lucide-toolbar-icon',
        title: 'Undo',
      },
      {
        name: 'redo',
        action: (editor: any) => {
          const cm = editor.codemirror;
          cm.redo();
        },
        className: 'lucide-toolbar-icon',
        title: 'Redo',
      },
    ] as any,
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

  // Early return for missing text control - show onboarding
  if (!config.textControl) {
    return (
      <Onboarding 
        hasTextControl={false}
        onOpenSettings={handleShowSettings}
      />
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
          key={config.textControl}
          variableName={config.textControl}
          onMarkdownChange={handleMarkdownChange}
        />
      )}
      {config.mode === 'style' && (
        <Button 
          className="absolute top-5 right-5 z-10 gap-2"
          onClick={handleShowSettings}
          size="sm"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Button>
      )}
      
      {config.mode === 'edit' ? (
        /* Edit Mode - Split View */
        <div className="w-full h-screen flex flex-col">
          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            {hasUnsavedChanges && (
              <span className="text-sm text-yellow-600">Unsaved changes</span>
            )}
            {!hasUnsavedChanges && <div></div>}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={settings.editorViewMode === 'editor' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleToggleViewMode('editor')}
                  className="gap-1 h-8"
                  title="Editor Only"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  variant={settings.editorViewMode === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleToggleViewMode('split')}
                  className="gap-1 h-8"
                  title="Split View"
                >
                  <Columns2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={settings.editorViewMode === 'preview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleToggleViewMode('preview')}
                  className="gap-1 h-8"
                  title="Preview Only"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="h-6 w-px bg-border"></div>
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
            {(settings.editorViewMode === 'editor' || settings.editorViewMode === 'split') && (
              <div className={`${settings.editorViewMode === 'split' ? 'w-1/2 border-r' : 'w-full'} overflow-auto`}>
                <SimpleMDE
                  value={draftContent}
                  onChange={handleEditorChange}
                  options={editorOptions}
                />
              </div>
            )}

            {/* Preview Pane */}
            {(settings.editorViewMode === 'preview' || settings.editorViewMode === 'split') && (
              <div className={`${settings.editorViewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-auto p-5`}>
                <div className={getContainerClasses()}>
                  {draftContent ? (
                    <div 
                      className="prose prose-lg max-w-none markdown-content"
                      style={{ 
                        textAlign: settings.textAlignment,
                        fontFamily: settings.fontFamily 
                      }}
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
            )}
          </div>
        </div>
      ) : (
        /* View Mode - Normal Preview */
        <div className="w-full h-screen p-5 box-border overflow-auto">
          <div className={getContainerClasses()}>
            {markdownContent ? (
              <div 
                className="prose prose-lg max-w-none markdown-content"
                style={{ 
                  textAlign: settings.textAlignment,
                  fontFamily: settings.fontFamily 
                }}
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


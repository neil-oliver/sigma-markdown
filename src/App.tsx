import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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

// Source-specific cache keys to prevent cross-source cache pollution
const getCacheKey = (sourceType: string) => `sigma-markdown-cache-${sourceType}`;

// Cache storage for each source type
const globalContentCaches: Record<string, string> = {
  textControl: '',
  tableColumn: ''
};

// Try to restore caches from sessionStorage on module load
try {
  const textCache = sessionStorage.getItem(getCacheKey('textControl'));
  if (textCache) {
    globalContentCaches.textControl = textCache;
  }
  const tableCache = sessionStorage.getItem(getCacheKey('tableColumn'));
  if (tableCache) {
    globalContentCaches.tableColumn = tableCache;
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

// Separate component for table element connection (read-only)
interface TableConnectorProps {
  elementId: string;
  columnId: string;
  onMarkdownChange: (markdown: string) => void;
}

const TableConnector: React.FC<TableConnectorProps> = ({ elementId, columnId, onMarkdownChange }) => {
  // Use ref to avoid re-subscribing when callback changes
  const onMarkdownChangeRef = useRef(onMarkdownChange);
  onMarkdownChangeRef.current = onMarkdownChange;
  
  // Track if we've received data to avoid clearing on unmount race
  const hasReceivedData = useRef(false);
  
  useEffect(() => {
    if (!elementId || !columnId) {
      return;
    }
    
    hasReceivedData.current = false;
    
    // Subscribe to element data changes
    const unsubscribe = client.elements.subscribeToElementData(elementId, (elementData) => {
      if (!elementData || Object.keys(elementData).length === 0) {
        return;
      }
      
      // Get first row value from the selected column
      const columnData = elementData[columnId];
      
      if (columnData && columnData.length > 0) {
        const firstRowValue = String(columnData[0] ?? '');
        hasReceivedData.current = true;
        onMarkdownChangeRef.current(firstRowValue);
      } else {
        // Fallback: use first available column if configured column not found
        const dataKeys = Object.keys(elementData);
        const firstColumnKey = dataKeys[0];
        const firstColumnData = elementData[firstColumnKey];
        
        if (firstColumnData && firstColumnData.length > 0) {
          const firstRowValue = String(firstColumnData[0] ?? '');
          hasReceivedData.current = true;
          onMarkdownChangeRef.current(firstRowValue);
        }
      }
    });
    
    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [elementId, columnId]);
  
  return null; // This component only handles data, no rendering
};

// Configure the plugin editor panel
client.config.configureEditorPanel([
  { name: 'sourceType', type: 'radio', label: 'Source', values: ['textControl', 'tableColumn'], defaultValue: 'textControl' },
  { name: 'textControl', type: 'variable', label: 'Text Control (Markdown Source)' },
  { name: 'tableElement', type: 'element', label: 'Table Element' },
  { name: 'tableColumn', type: 'column', source: 'tableElement', allowMultiple: false, label: 'Markdown Column' },
  { name: 'config', type: 'text', label: 'Settings Config (JSON)', defaultValue: "{}" },
  { name: 'mode', type: 'radio', label: 'Mode', values: ['preview', 'style', 'edit'], defaultValue: 'preview' }
]);

const App: React.FC = (): React.JSX.Element => {
  const rawConfig: SigmaConfig = useConfig();
  
  // Lock in config values once we have valid table config
  // This prevents Sigma SDK's intermittent empty updates from unmounting our connector
  const lockedConfigRef = useRef<SigmaConfig | null>(null);
  
  // Check if this config has valid table source configuration
  const hasValidTableConfig = rawConfig.sourceType === 'tableColumn' && 
                              rawConfig.tableElement && 
                              rawConfig.tableColumn;
  
  // Check if this config has valid text control configuration  
  const hasValidTextConfig = rawConfig.sourceType === 'textControl' && rawConfig.textControl;
  
  // Lock in the config when we get valid values
  if (hasValidTableConfig || hasValidTextConfig || rawConfig.sourceType) {
    lockedConfigRef.current = { ...rawConfig };
  }
  
  // Use locked config if available, otherwise use raw config
  const config = lockedConfigRef.current || rawConfig;
  
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settings, setSettings] = useState<PluginSettings>(DEFAULT_SETTINGS);
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [draftContent, setDraftContent] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // Determine effective mode - table source is read-only, so force preview mode
  const effectiveMode = config.sourceType === 'tableColumn' ? 'preview' : config.mode;
  
  // Handle markdown content updates from the connectors
  const handleMarkdownChange = useCallback((markdown: string) => {
    const sourceType = config.sourceType || 'textControl';
    const cacheKey = getCacheKey(sourceType);
    
    // Update source-specific cache and persist to sessionStorage
    if (markdown) {
      globalContentCaches[sourceType] = markdown;
      try {
        sessionStorage.setItem(cacheKey, markdown);
      } catch (e) {
        console.warn('Failed to persist to sessionStorage:', e);
      }
    } else {
      // If cache is empty, try to restore from sessionStorage
      if (!globalContentCaches[sourceType]) {
        try {
          const stored = sessionStorage.getItem(cacheKey);
          if (stored) {
            globalContentCaches[sourceType] = stored;
          }
        } catch (e) {
          console.warn('Failed to restore from sessionStorage:', e);
        }
      }
    }
    
    // Update state, using cache for current source type if markdown is empty
    const finalContent = markdown || globalContentCaches[sourceType];
    setMarkdownContent(finalContent);
    
    // Update draft if we're in edit mode and don't have unsaved changes
    // Only applies to textControl source (tableColumn is read-only)
    if (config.mode === 'edit' && !hasUnsavedChanges && sourceType === 'textControl') {
      setDraftContent(finalContent);
    }
  }, [config.mode, config.sourceType, hasUnsavedChanges]);

  // Initialize draft content when entering edit mode (only for textControl source)
  useEffect(() => {
    const sourceType = config.sourceType || 'textControl';
    if (config.mode === 'edit' && !hasUnsavedChanges && sourceType === 'textControl') {
      const content = markdownContent || globalContentCaches[sourceType];
      setDraftContent(content);
    }
  }, [config.mode, config.sourceType, markdownContent, hasUnsavedChanges]);

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

  // Determine if source is properly configured
  const isSourceConfigured = config.sourceType === 'tableColumn' 
    ? Boolean(config.tableElement && config.tableColumn)
    : Boolean(config.textControl);

  // Early return for missing source configuration - show onboarding
  if (!isSourceConfigured) {
    return (
      <Onboarding 
        hasTextControl={false}
        sourceType={config.sourceType || 'textControl'}
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
      {/* Conditionally render the appropriate data connector */}
      {config.sourceType === 'tableColumn' && config.tableElement && config.tableColumn ? (
        <TableConnector
          key={`${config.tableElement}-${config.tableColumn}`}
          elementId={config.tableElement}
          columnId={config.tableColumn}
          onMarkdownChange={handleMarkdownChange}
        />
      ) : config.textControl ? (
        <VariableConnector
          key={config.textControl}
          variableName={config.textControl}
          onMarkdownChange={handleMarkdownChange}
        />
      ) : null}
      {effectiveMode === 'style' && (
        <Button 
          className="absolute top-5 right-5 z-10 gap-2"
          onClick={handleShowSettings}
          size="sm"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </Button>
      )}
      
      {effectiveMode === 'edit' ? (
        /* Edit Mode - Split View (only available for textControl source) */
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
                        fontFamily: settings.fontFamily,
                        fontSize: settings.fontSize ? `${settings.fontSize}px` : undefined
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
                  fontFamily: settings.fontFamily,
                  fontSize: settings.fontSize ? `${settings.fontSize}px` : undefined
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
                  {config.sourceType === 'tableColumn' 
                    ? 'The selected table column is empty or contains no markdown content.'
                    : 'The selected text control is empty or contains no markdown content.'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {config.sourceType === 'tableColumn'
                    ? 'Ensure the first row of the selected column contains markdown text.'
                    : 'Enter some markdown text in the connected control to see it rendered here.'
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


import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './components/ui/dialog';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { PluginSettings } from './types/sigma';

// Default settings
export const DEFAULT_SETTINGS: PluginSettings = {
  backgroundColor: '#ffffff',
  textColor: '#000000',
  transparentBackground: true,
  textAlignment: 'left',
  contentAlignment: 'left',
  blockAlignment: 'left',
  contentWidth: 'full'
};

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: PluginSettings;
  onSave: (settings: PluginSettings) => void;
  client: any; // Use any for now to avoid complex typing issues
}

const Settings: React.FC<SettingsProps> = ({ 
  isOpen, 
  onClose, 
  currentSettings, 
  onSave, 
  client 
}) => {
  const [tempSettings, setTempSettings] = useState<PluginSettings>(currentSettings);

  // Update temp settings when current settings change
  useEffect(() => {
    // Ensure all required properties exist with defaults
    const settingsWithDefaults: PluginSettings = {
      ...DEFAULT_SETTINGS,
      ...currentSettings
    };
    setTempSettings(settingsWithDefaults);
  }, [currentSettings]);

  const handleSave = (): void => {
    const configJson = JSON.stringify(tempSettings, null, 2);
    
    try {
      client.config.set({ config: configJson });
      onSave(tempSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleCancel = (): void => {
    setTempSettings(currentSettings);
    onClose();
  };

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, backgroundColor: e.target.value }));
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, textColor: e.target.value }));
  };

  const handleTransparentBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, transparentBackground: e.target.checked }));
  };

  const handleTextAlignmentChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, textAlignment: e.target.value as 'left' | 'center' | 'right' | 'justify' }));
  };

  const handleContentAlignmentChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, contentAlignment: e.target.value as 'left' | 'center' | 'right' }));
  };

  const handleBlockAlignmentChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, blockAlignment: e.target.value as 'left' | 'center' | 'right' | 'justify' }));
  };

  const handleContentWidthChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setTempSettings((prev: PluginSettings) => ({ ...prev, contentWidth: e.target.value as 'full' | 'narrow' | 'medium' | 'wide' }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plugin Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                id="transparentBackground"
                type="checkbox"
                checked={tempSettings.transparentBackground}
                onChange={handleTransparentBackgroundChange}
                className="h-4 w-4"
              />
              <Label htmlFor="transparentBackground">Transparent Background</Label>
            </div>
            <p className="text-sm text-muted-foreground">Enable transparent background (overrides background color)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backgroundColor">Background Color</Label>
            <Input
              id="backgroundColor"
              type="color"
              value={tempSettings.backgroundColor}
              onChange={handleBackgroundColorChange}
              className="h-10"
              disabled={tempSettings.transparentBackground}
            />
            <p className="text-sm text-muted-foreground">
              {tempSettings.transparentBackground 
                ? "Background color is disabled when transparency is enabled" 
                : "Choose the background color for the plugin"
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="textColor">Text Color</Label>
            <Input
              id="textColor"
              type="color"
              value={tempSettings.textColor}
              onChange={handleTextColorChange}
              className="h-10"
            />
            <p className="text-sm text-muted-foreground">Choose the text color for the plugin</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentAlignment">Content Alignment</Label>
            <select
              id="contentAlignment"
              value={tempSettings.contentAlignment}
              onChange={handleContentAlignmentChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
            <p className="text-sm text-muted-foreground">Choose how the entire content block is positioned</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="textAlignment">Text Alignment</Label>
            <select
              id="textAlignment"
              value={tempSettings.textAlignment}
              onChange={handleTextAlignmentChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
            <p className="text-sm text-muted-foreground">Choose how individual text elements are aligned</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blockAlignment">Block Alignment</Label>
            <select
              id="blockAlignment"
              value={tempSettings.blockAlignment}
              onChange={handleBlockAlignmentChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
            <p className="text-sm text-muted-foreground">Choose how markdown blocks (headings, paragraphs) are aligned</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentWidth">Content Width</Label>
            <select
              id="contentWidth"
              value={tempSettings.contentWidth}
              onChange={handleContentWidthChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="full">Full Width</option>
              <option value="wide">Wide (1200px)</option>
              <option value="medium">Medium (800px)</option>
              <option value="narrow">Narrow (600px)</option>
            </select>
            <p className="text-sm text-muted-foreground">Choose the maximum width of the content area</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Settings; 
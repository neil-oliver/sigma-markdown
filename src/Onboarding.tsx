import React from 'react';
import { Badge } from './components/ui/badge';
import { FileText, PlugZap, Link2 } from 'lucide-react';

function StepCard({ icon: Icon, title, children, complete = false }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  complete?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-md flex items-center justify-center border ${complete ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border-border'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium leading-none">{title}</h4>
            {complete && (
              <Badge variant="secondary" className="text-[10px]">Configured</Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface OnboardingProps {
  hasTextControl: boolean;
  onOpenSettings: () => void;
}

function Onboarding({ hasTextControl, onOpenSettings }: OnboardingProps) {
  return (
    <div className="h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="rounded-xl border border-border bg-card text-card-foreground p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Sigma Markdown</h2>
                <Badge variant="secondary">Setup</Badge>
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Display and edit markdown content from any Sigma text control. Connect your source, 
                configure your styles, and switch between preview and edit modes.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <StepCard icon={Link2} title="Connect Text Control" complete={hasTextControl}>
              Link a Sigma text control to provide your markdown content. 
              Use the <span className="font-medium">Text Control</span> field in the editor panel.
            </StepCard>
            <StepCard icon={PlugZap} title="Configure Display">
              Customize colors, alignment, and layout in Settings. 
              Set mode to <span className="font-medium">Style</span> to access settings.
            </StepCard>
          </div>

          <div className="mt-6 rounded-md border border-border bg-muted/30 text-muted-foreground px-4 py-3 text-sm">
            <p className="font-medium mb-1">Quick Start:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a text control in your Sigma workbook</li>
              <li>In the plugin editor panel, select the text control under <span className="font-medium">Text Control (Markdown Source)</span></li>
              <li>Enter markdown in the text control or set <span className="font-medium">Mode</span> to "edit" to use the built-in editor</li>
              <li>Switch to "preview" mode to display your formatted content</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;


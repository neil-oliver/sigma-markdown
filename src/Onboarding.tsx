import React from 'react';
import { Badge } from './components/ui/badge';
import { FileText, Link2, Table } from 'lucide-react';

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
  sourceType?: 'textControl' | 'tableColumn';
  onOpenSettings: () => void;
}

function Onboarding({ hasTextControl, sourceType = 'textControl', onOpenSettings }: OnboardingProps) {
  const isTableSource = sourceType === 'tableColumn';
  
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
                Display markdown content from a Sigma text control or table column. 
                Choose your source type in the editor panel, then configure your connection.
              </p>
            </div>
          </div>

          {/* Source Type Selection Info */}
          <div className="mt-6 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium mb-2">Step 1: Choose your source type in the editor panel</p>
            <p className="text-muted-foreground">
              Set <span className="font-medium">Source</span> to either <span className="font-medium">"textControl"</span> or <span className="font-medium">"tableColumn"</span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <StepCard 
              icon={Link2} 
              title="Option A: Text Control" 
              complete={!isTableSource && hasTextControl}
            >
              <div className={isTableSource ? 'opacity-50' : ''}>
                Link a Sigma text control to provide markdown content. 
                Supports <span className="font-medium">preview</span> and <span className="font-medium">edit</span> modes.
              </div>
            </StepCard>
            <StepCard 
              icon={Table} 
              title="Option B: Table Column" 
              complete={isTableSource && hasTextControl}
            >
              <div className={!isTableSource ? 'opacity-50' : ''}>
                Use the first row of a table column as markdown content. 
                <span className="font-medium">Read-only</span> preview mode.
              </div>
            </StepCard>
          </div>

          <div className="mt-6 rounded-md border border-border bg-muted/30 text-muted-foreground px-4 py-3 text-sm">
            <div className="font-medium mb-1 flex items-center gap-2">
              <span>Step 2: Configure your {isTableSource ? 'table column' : 'text control'}</span>
              <Badge variant="outline" className="text-[10px]">Selected</Badge>
            </div>
            {isTableSource ? (
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Select a table element under <span className="font-medium">Table Element</span></li>
                <li>Choose the column containing markdown under <span className="font-medium">Markdown Column</span></li>
                <li>The first row of the selected column will be rendered as markdown</li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Create a text control in your Sigma workbook</li>
                <li>Select it under <span className="font-medium">Text Control (Markdown Source)</span></li>
                <li>Enter markdown or use <span className="font-medium">Mode: edit</span> for the built-in editor</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;


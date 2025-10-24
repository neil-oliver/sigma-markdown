# Sigma Markdown Display Plugin

A Sigma Computing plugin that displays markdown content from a Sigma control, built with React, TypeScript, and shadcn/ui components.

## Features

- **Markdown Rendering**: Displays markdown content from a selected Sigma text control using react-markdown
- **Settings Panel**: Comprehensive customization options including colors, alignment, and sizing (accessible in style mode)
- **TypeScript**: Full type safety with strict configuration and better developer experience
- **shadcn/ui Components**: Modern, accessible UI components built with Radix UI
- **Sigma Integration**: Ready-to-use Sigma plugin configuration for variable controls
- **Responsive Design**: Clean layout that adapts to different container sizes

## Getting Started

1. **Clone this template** to start building your own Sigma plugin
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start development server**:
   ```bash
   npm start
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```
5. **Type checking**:
   ```bash
   npm run type-check
   ```
6. **Linting**:
   ```bash
   npm run lint
   ```
7. **Clean cache**:
   ```bash
   npm run clean
   ```

## Plugin Configuration

The plugin is configured with the following editor panel options:

- **Text Control (Markdown Source)**: Select a Sigma text control that contains markdown content
- **Settings Config**: JSON configuration for plugin settings
- **Style Mode**: Toggle to access settings panel

### Available Settings

The plugin offers comprehensive customization options:

**Colors & Background:**
- **Background Color**: Choose a custom background color
- **Text Color**: Set the text color for all content
- **Transparent Background**: Enable transparency (overrides background color)

**Alignment Options:**
- **Content Alignment**: Position the entire content block (left, center, right)
- **Text Alignment**: Align individual text elements (left, center, right, justify)
- **Block Alignment**: Align markdown blocks like headings and paragraphs (left, center, right, justify)

**Sizing Options:**
- **Content Width**: Control the maximum width of the content area
  - Full Width: Uses the full container width
  - Wide: Maximum 1200px
  - Medium: Maximum 800px
  - Narrow: Maximum 600px

## Customization

### Adding New Settings

1. Update `DEFAULT_SETTINGS` in `src/Settings.js`
2. Add new form controls to the Settings component
3. Apply the settings in your main component

### Modifying the Display

The main display logic is in `src/App.tsx`. The plugin uses `react-markdown` to render markdown content from the selected Sigma control. You can customize the markdown rendering by modifying the `ReactMarkdown` component and its styling.

### Styling

The template uses Tailwind CSS with shadcn/ui components. You can:
- Modify colors in `tailwind.config.js`
- Add custom styles in `src/App.css`
- Use the built-in design system components

## File Structure

```
src/
├── App.tsx              # Main plugin component (TypeScript)
├── Settings.tsx         # Settings panel component (TypeScript)
├── index.tsx            # Entry point (TypeScript)
├── types/
│   ├── sigma.ts         # Plugin type definitions
│   └── sigma-client.d.ts # Sigma client declarations
├── components/ui/       # shadcn/ui components (TypeScript)
├── lib/
│   └── utils.ts         # Utility functions (TypeScript)
└── App.css              # Clean CSS file
```

## Dependencies

- **React**: UI framework
- **TypeScript**: Type safety and developer experience
- **@sigmacomputing/plugin**: Sigma plugin SDK
- **react-markdown**: Markdown rendering library
- **shadcn/ui**: Component library
- **Tailwind CSS**: Styling framework
- **Lucide React**: Icons

## Usage

1. **Setup in Sigma**: 
   - Create a text control (input, text area, or variable) in your Sigma workbook
   - Add markdown content to the control (e.g., `# My Title\n\nSome **bold** text`)
   
2. **Configure the Plugin**:
   - Select the text control as the "Text Control (Markdown Source)"
   - Enable "Style Mode" to access styling settings
   - Customize colors, alignment, and sizing options in the settings panel

3. **Markdown Features Supported**:
   - Headers (# ## ### etc.)
   - **Bold** and *italic* text
   - Lists (ordered and unordered)
   - Links [text](url)
   - `Code` and code blocks
   - > Blockquotes
   - Tables
   - And more standard markdown syntax

## Development Tips

1. **Test in Sigma**: Use the development server to test your plugin in Sigma
2. **Settings**: Always save settings to the config using `client.config.set()`
3. **Error Handling**: Add proper error boundaries and loading states
4. **Responsive Design**: Ensure your plugin works in different container sizes
5. **Markdown Content**: The plugin will render any text from the connected control as markdown

## License

This template is provided as-is for building Sigma Computing plugins.

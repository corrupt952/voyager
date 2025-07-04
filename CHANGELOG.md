# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.13] - 2025-07-04

### Fixed
- Fixed missing visualizer assets error in published npm package
  - Removed incorrect dependency on local assets directory
  - CLI now correctly reads from node_modules/@voyager-vue/ui/dist/template.html
  - Based on v0.0.11 (v0.0.12 was a recovery release from accidental unpublishing)

## [0.0.12] - 2025-07-04

### Fixed
- Re-deployed version 0.0.4 content after accidentally unpublishing all package versions

## [0.0.11] - 2025-07-04

### Added
- Interactive expandable nodes in dependency graph for better navigation
- Auto-expand focus node when graph focus changes
- Enhanced sidebar with health analysis and advanced filtering options

### Changed
- Refactored ComponentSelector into separate Sidebar component for better organization
- Improved graph component structure with cleaner code organization

### Fixed
- Removed dead code and unused imports from graph components

## [0.0.10] - 2025-07-04

### Fixed
- Use relative paths instead of absolute paths for tree view root in component selector
  - Tree view now correctly shows project structure from working directory
  - Removed unnecessary system paths like /Users from the tree hierarchy

## [0.0.9] - 2025-07-04

### Added
- Integrated Tailwind CSS v4 for modern styling with Vite plugin
- React Flow base styles separation for better CSS management
- Overflow handling and layout constraints for proper component display

### Changed
- Replaced all inline styles with Tailwind CSS utility classes
- Updated React Flow CSS import from style.css to base.css
- Refactored component styles for better maintainability

### Fixed
- React Flow component display issues with proper height constraints
- TypeScript compilation errors with invalid scriptSetup type references
- Layout overflow issues in sidebar and main content areas
- SVG edge visibility and pointer events in React Flow

## [0.0.8] - 2025-01-04

### Added
- Vue API type visualization and filtering for better component analysis
- Enhanced Vue API detection with comprehensive pattern matching

## [0.0.7] - 2025-01-04

### Fixed
- Embed JS and CSS directly in generated HTML for single-file output

### Added
- LICENSE file

## [0.0.6] - 2025-07-03

### Added
- Tree view mode to component selector sidebar with collapsible folders
- Toggle buttons to switch between flat and tree view modes
- Folder hierarchy visualization based on file paths

## [0.0.5] - 2025-07-03

### Changed
- Changed Japanese placeholder text to English in component selector

## [0.0.4] - 2025-07-03

### Fixed
- Added .js extensions to module imports for ESM compatibility
- Fixed module resolution errors when running CLI commands

## [0.0.3] - 2025-07-03

### Fixed
- Fixed remaining @voyager references to @voyager-vue in UI components and config files

## [0.0.2] - 2025-07-03

### Changed
- Updated package scope from `@voyager` to `@voyager-vue` for npm publishing
- Added npm package metadata (license, repository, homepage, bugs, engines)
- Updated import statements to use new package scope

### Fixed
- Fixed import statements to reference correct package names after scope change

## [0.0.1] - 2025-01-03

### Added

- **Core Analysis Engine**: Vue component dependency analysis with support for .vue, .js, and .ts files
- **Interactive Graph Visualization**: Web-based dependency graph with pan, zoom, and node selection
- **CLI Commands**:
  - `voyager graph` - Generate interactive HTML dependency graphs
  - `voyager deps` - Analyze dependencies for specific files with tree output
  - `voyager stats` - Display project statistics and analysis metrics
- **Advanced Path Resolution**: Support for TypeScript path mapping, relative imports, and node modules
- **Component Categorization**: Automatic file type detection and organization
- **Collapsible Sidebar**: Organized component selector with search functionality
- **Graph Layout Engine**: Dagre integration for automatic node positioning
- **Circular Dependency Detection**: Identify and report circular import chains
- **Orphaned Component Analysis**: Find unused components in the codebase
- **Import Statistics**: Track most frequently imported components
- **Flexible Output Options**: HTML generation and JSON export support
- **Ignore Pattern Support**: Configurable file filtering with glob patterns
- **Error Handling**: Comprehensive error reporting and graceful failure handling
- **Cross-platform Support**: Works on macOS, Linux, and Windows
- **TypeScript Support**: Full TypeScript implementation with proper type definitions
- **Monorepo Architecture**: Multi-package structure with core, UI, and CLI packages
- **Test Suite**: Comprehensive testing with real filesystem fixtures

### Technical Details

- Built with modern JavaScript/TypeScript and ESM modules
- React Flow for interactive graph visualization
- Dagre for automatic graph layout
- Vitest for testing framework
- Supports Vue.js component analysis and visualization

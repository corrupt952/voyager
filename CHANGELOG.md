# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.7] - 2025-01-04

### Added
- Vue API type visualization and filtering for better component analysis
- Enhanced Vue API detection with comprehensive pattern matching

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

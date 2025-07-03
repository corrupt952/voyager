# Voyager - Vue Component Dependency Visualizer

Voyager generates beautiful, interactive dependency diagrams from your Vue.js components. Whether you're working on small or large applications, Voyager helps you visualize complex component relationships with ease.

![Voyager Demo](./docs/assets/demo.gif)

## What's Voyager?

- **Beautiful UI & Interactive**: Clean design with intuitive features like panning, zooming, and filtering make it easy to understand even the most complex component relationships.
- **Simple Import Analysis**: Seamlessly analyze your Vue.js components and their dependencies without complex configuration.
- **Atomic Design Support**: Automatically detect and visualize your component hierarchy based on Atomic Design principles.
- **High Performance**: Optimized for both small and large projects, easily handling hundreds of components.
- **Fully Open-Source**: Shape Voyager to fit your team's needs through contributions.

## Features

- 📊 Simple import analysis for dependency visualization
- 🎨 Intuitive graph visualization
- 🔍 Automatic Atomic Design hierarchy detection
- 📁 Directory-based component grouping
- 🔄 Interactive dependency exploration

## Quick Start

> **Note**: Voyager is not yet published to npm. Please build from source for now.

```bash
# Clone and build from source
git clone https://github.com/corrupt952/voyager.git
cd voyager
npm install
npm run build

# Run in your Vue.js project
cd /path/to/your/vue-project

# Generate interactive dependency graph
npx voyager graph src/

# Show dependencies for a specific file
npx voyager deps src/ -t components/MyComponent.vue

# Show project statistics
npx voyager stats src/
```

## Commands

### `voyager graph <directory>`
Generate an interactive HTML dependency graph.

```bash
# Basic usage
voyager graph src/

# Custom output file
voyager graph src/ -o my-graph.html

# With custom ignore patterns
voyager graph src/ --ignore "**/*.config.js" "**/*.mock.js"
```

### `voyager deps <directory>`
Show dependencies for a specific file.

```bash
# Show direct dependencies only
voyager deps src/ -t components/Button.vue

# Show dependencies up to depth 3
voyager deps src/ -t components/Button.vue -d 3

# Show all dependency levels
voyager deps src/ -t components/Button.vue -d all

# Output as JSON
voyager deps src/ -t components/Button.vue --json
```

### `voyager stats <directory>`
Display component statistics and analysis.

```bash
# Show statistics
voyager stats src/

# Output as JSON for CI/CD integration
voyager stats src/ --json
```

## Roadmap

- 🔄 Vuex store and component relationship visualization
- 📝 Detailed Props and Emit relationship display
- ✅ Test coverage integration
- 📊 Performance analysis features

Visit our [GitHub Projects](https://github.com/corrupt952/voyager/projects) page to see what we're working on.

## Documentation

Coming soon...

## Contributing

Thank you for your interest in contributing to Voyager!
Contribution guidelines are currently in preparation.

**If you find this project helpful, please give it a star! ⭐**
Your support helps us reach a wider audience and continue development.

## License

This project is licensed under the [MIT License](./LICENSE).

## Author

- [K@zuki.](https://zuki.dev)

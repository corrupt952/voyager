import { resolve, dirname, join, isAbsolute } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Path resolver options
 */
export interface PathResolverOptions {
  /** Project root directory */
  rootDir: string;
  /** TypeScript base URL */
  baseUrl?: string;
  /** TypeScript path aliases */
  paths?: Record<string, string[]>;
  /** Whether to resolve node_modules */
  resolveNodeModules?: boolean;
}

/**
 * Path resolution result
 */
export interface ResolveResult {
  /** Resolved path */
  resolvedPath: string | null;
  /** Error message */
  error?: string;
}

/**
 * Path resolver class
 */
export class PathResolver {
  private readonly rootDir: string;
  private readonly baseUrl: string;
  private readonly paths: Record<string, string[]>;
  private readonly resolveNodeModules: boolean;
  private readonly extensions = ['.vue', '.ts', '.tsx', '.js', '.jsx', '.json'];

  constructor(options: PathResolverOptions) {
    this.rootDir = resolve(options.rootDir);
    this.baseUrl = options.baseUrl ? resolve(this.rootDir, options.baseUrl) : this.rootDir;
    this.paths = options.paths || {};
    this.resolveNodeModules = options.resolveNodeModules ?? true;
  }

  /**
   * Resolve import path
   */
  resolve(importPath: string, fromFile: string): ResolveResult {
    try {
      // 1. Validation
      if (!this.isValidImportPath(importPath)) {
        return { resolvedPath: null, error: 'Invalid path' };
      }

      // 2. Handle absolute paths
      if (isAbsolute(importPath)) {
        return this.resolveWithExtension(importPath);
      }

      // 3. Resolve alias paths
      if (importPath.startsWith('@') || importPath.startsWith('#')) {
        const aliasResult = this.resolveAliasPath(importPath);
        if (aliasResult.resolvedPath) {
          return aliasResult;
        }
      }

      // 4. Determine node_modules resolution
      if (!importPath.startsWith('.')) {
        if (!this.resolveNodeModules) {
          return { resolvedPath: null, error: 'node_modules resolution is disabled' };
        }
        const moduleResult = this.resolveNodeModule(importPath, fromFile);
        if (moduleResult.resolvedPath) {
          return moduleResult;
        }
      }

      // 5. Resolve relative paths (including non-alias paths)
      return this.resolveRelativePath(importPath, fromFile);
    } catch (error) {
      return {
        resolvedPath: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if import path is valid
   */
  private isValidImportPath(importPath: string): boolean {
    return importPath !== '' && typeof importPath === 'string';
  }

  /**
   * Resolve path from node_modules
   */
  private resolveNodeModule(importPath: string, fromFile: string): ResolveResult {
    // Check project root node_modules first
    const rootNodeModulesPath = join(this.rootDir, 'node_modules', importPath);
    const rootResult = this.resolveWithExtension(rootNodeModulesPath);
    if (rootResult.resolvedPath) {
      return rootResult;
    }

    // Check parent directories' node_modules
    let dir = dirname(fromFile);
    while (dir !== this.rootDir && dir !== '/' && dir !== '.') {
      const nodeModulesPath = join(dir, 'node_modules', importPath);
      const result = this.resolveWithExtension(nodeModulesPath);
      if (result.resolvedPath) {
        return result;
      }
      dir = dirname(dir);
    }

    return { resolvedPath: null, error: `Module not found: ${importPath}` };
  }

  /**
   * Resolve alias path
   */
  private resolveAliasPath(importPath: string): ResolveResult {
    for (const [alias, targets] of Object.entries(this.paths)) {
      const pattern = alias.replace(/\*$/, '');
      if (importPath.startsWith(pattern)) {
        const suffix = importPath.slice(pattern.length);
        for (const target of targets) {
          const resolvedPath = resolve(this.rootDir, target.replace(/\*$/, ''), suffix);
          const result = this.resolveWithExtension(resolvedPath);
          if (result.resolvedPath) {
            return result;
          }
        }
      }
    }
    return { resolvedPath: null, error: `Cannot resolve alias path: ${importPath}` };
  }

  /**
   * Resolve relative path
   */
  private resolveRelativePath(importPath: string, fromFile: string): ResolveResult {
    // For relative paths, resolve from the directory of fromFile
    if (importPath.startsWith('.')) {
      const baseDir = dirname(fromFile);
      const absolutePath = resolve(baseDir, importPath);
      return this.resolveWithExtension(absolutePath);
    }

    // For non-relative paths, resolve from baseUrl
    const absolutePath = resolve(this.baseUrl, importPath);
    return this.resolveWithExtension(absolutePath);
  }

  /**
   * Resolve path with extension
   */
  private resolveWithExtension(basePath: string): ResolveResult {
    // 1. Check complete path
    if (existsSync(basePath)) {
      if (statSync(basePath).isDirectory()) {
        // For directories, search for index.*
        for (const ext of this.extensions) {
          const indexPath = join(basePath, 'index' + ext);
          if (existsSync(indexPath)) {
            return { resolvedPath: indexPath };
          }
        }
      } else {
        return { resolvedPath: basePath };
      }
    }

    // 2. Check with extensions
    for (const ext of this.extensions) {
      const pathWithExt = basePath + ext;
      if (existsSync(pathWithExt)) {
        return { resolvedPath: pathWithExt };
      }
    }

    // 3. Check as directory and search for index.*
    const dirPath = basePath;
    if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
      for (const ext of this.extensions) {
        const indexPath = join(dirPath, 'index' + ext);
        if (existsSync(indexPath)) {
          return { resolvedPath: indexPath };
        }
      }
    }

    // 4. Check package.json (for node_modules)
    if (basePath.includes('node_modules')) {
      const pkgPath = join(basePath, 'package.json');
      if (existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          if (pkg.main) {
            const mainPath = join(basePath, pkg.main);
            if (existsSync(mainPath)) {
              return { resolvedPath: mainPath };
            }
          }
        } catch {
          // Ignore package.json read errors
        }
      }
    }

    return { resolvedPath: null, error: `File does not exist: ${basePath}` };
  }
}

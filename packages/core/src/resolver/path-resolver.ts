import { resolve, dirname, join, isAbsolute } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * パス解決のオプション
 */
export interface PathResolverOptions {
  /** プロジェクトのルートディレクトリ */
  rootDir: string;
  /** TypeScriptのベースURL */
  baseUrl?: string;
  /** TypeScriptのパスエイリアス */
  paths?: Record<string, string[]>;
  /** node_modulesの検索を行うかどうか */
  resolveNodeModules?: boolean;
}

/**
 * パス解決の結果
 */
export interface ResolveResult {
  /** 解決されたパス */
  resolvedPath: string | null;
  /** エラーメッセージ */
  error?: string;
}

/**
 * パスリゾルバークラス
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
   * インポートパスを解決する
   */
  resolve(importPath: string, fromFile: string): ResolveResult {
    try {
      // 1. バリデーション
      if (!this.isValidImportPath(importPath)) {
        return { resolvedPath: null, error: '無効なパスです' };
      }

      // 2. 絶対パスの処理
      if (isAbsolute(importPath)) {
        return this.resolveWithExtension(importPath);
      }

      // 3. エイリアスパスの解決
      if (importPath.startsWith('@') || importPath.startsWith('#')) {
        const aliasResult = this.resolveAliasPath(importPath);
        if (aliasResult.resolvedPath) {
          return aliasResult;
        }
      }

      // 4. node_modulesの解決判定
      if (!importPath.startsWith('.')) {
        if (!this.resolveNodeModules) {
          return { resolvedPath: null, error: 'node_modulesの解決が無効です' };
        }
        const moduleResult = this.resolveNodeModule(importPath, fromFile);
        if (moduleResult.resolvedPath) {
          return moduleResult;
        }
      }

      // 5. 相対パスの解決（非エイリアスパスも含む）
      return this.resolveRelativePath(importPath, fromFile);
    } catch (error) {
      return {
        resolvedPath: null,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      };
    }
  }

  /**
   * インポートパスが有効かどうかを判定する
   */
  private isValidImportPath(importPath: string): boolean {
    return importPath !== '' && typeof importPath === 'string';
  }

  /**
   * node_modulesからパスを解決する
   */
  private resolveNodeModule(importPath: string, fromFile: string): ResolveResult {
    // プロジェクトルートのnode_modulesを優先的に確認
    const rootNodeModulesPath = join(this.rootDir, 'node_modules', importPath);
    const rootResult = this.resolveWithExtension(rootNodeModulesPath);
    if (rootResult.resolvedPath) {
      return rootResult;
    }

    // 親ディレクトリのnode_modulesを順に確認
    let dir = dirname(fromFile);
    while (dir !== this.rootDir && dir !== '/' && dir !== '.') {
      const nodeModulesPath = join(dir, 'node_modules', importPath);
      const result = this.resolveWithExtension(nodeModulesPath);
      if (result.resolvedPath) {
        return result;
      }
      dir = dirname(dir);
    }

    return { resolvedPath: null, error: `モジュールが見つかりません: ${importPath}` };
  }

  /**
   * エイリアスパスを解決する
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
    return { resolvedPath: null, error: `エイリアスパスを解決できません: ${importPath}` };
  }

  /**
   * 相対パスを解決する
   */
  private resolveRelativePath(importPath: string, fromFile: string): ResolveResult {
    // 相対パスの場合は、fromFileからの相対パスとして解決
    if (importPath.startsWith('.')) {
      const baseDir = dirname(fromFile);
      const absolutePath = resolve(baseDir, importPath);
      return this.resolveWithExtension(absolutePath);
    }

    // 非相対パスの場合は、baseUrlからの相対パスとして解決
    const absolutePath = resolve(this.baseUrl, importPath);
    return this.resolveWithExtension(absolutePath);
  }

  /**
   * パスに拡張子を付与して解決する
   */
  private resolveWithExtension(basePath: string): ResolveResult {
    // 1. 完全なパスでの確認
    if (existsSync(basePath)) {
      if (statSync(basePath).isDirectory()) {
        // ディレクトリの場合はindex.*を検索
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

    // 2. 拡張子を付けて確認
    for (const ext of this.extensions) {
      const pathWithExt = basePath + ext;
      if (existsSync(pathWithExt)) {
        return { resolvedPath: pathWithExt };
      }
    }

    // 3. ディレクトリとして確認し、index.*を検索
    const dirPath = basePath;
    if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
      for (const ext of this.extensions) {
        const indexPath = join(dirPath, 'index' + ext);
        if (existsSync(indexPath)) {
          return { resolvedPath: indexPath };
        }
      }
    }

    // 4. package.jsonの確認（node_modulesの場合）
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
          // package.jsonの読み込みエラーは無視
        }
      }
    }

    return { resolvedPath: null, error: `ファイルが存在しません: ${basePath}` };
  }
}

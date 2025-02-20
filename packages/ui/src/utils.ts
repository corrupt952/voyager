/**
 * ノードのラベルを生成する関数
 */
export function getNodeLabel(path: string): string {
  const segments = path.split('/');
  const lastSegment = segments[segments.length - 1];

  // index.vue（または他の拡張子のindex）の場合は親ディレクトリ名とファイル名を組み合わせて表示
  if (lastSegment.startsWith('index.')) {
    const parentDir = segments[segments.length - 2];
    return parentDir ? `${parentDir} (${lastSegment})` : lastSegment;
  }

  // それ以外は従来通りファイル名を使用
  return lastSegment;
}

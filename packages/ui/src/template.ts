export function createHtmlTemplate(graphData: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue Component Dependencies</title>
  <style>
    __CSS_CONTENT__
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    window.__GRAPH_DATA__ = ${graphData};
  </script>
  <script>
    __JS_CONTENT__
  </script>
</body>
</html>
`;
}

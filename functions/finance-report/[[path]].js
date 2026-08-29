// Совместимость со старой PWA-конфигурацией GitHub Pages.
// Раньше manifest открывал приложение по /finance-report/.
// На Cloudflare Pages приложение находится в корне сайта.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const legacyPrefix = '/finance-report';

  let targetPath = url.pathname.slice(legacyPrefix.length);
  if (!targetPath || targetPath === '/') targetPath = '/';
  if (!targetPath.startsWith('/')) targetPath = `/${targetPath}`;

  url.pathname = targetPath;
  return Response.redirect(url.toString(), 302);
}

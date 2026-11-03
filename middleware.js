import { next, rewrite } from '@vercel/functions';

export const config = {
  matcher: ['/team', '/team.html', '/etude-de-cas.html'],
};

const TEAM_SESSION_TOKEN = '2120615f0760232ccfe896055efc4a0326bf84fa4d09935e';

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function middleware(request) {
  const url = new URL(request.url);

  // pages d'étude de cas : on injecte les balises de partage (titre, description, image) côté serveur
  if (url.pathname === '/etude-de-cas.html') {
    const slug = url.searchParams.get('slug');
    if (!slug) return next();
    return rewrite(new URL('/api/etude-de-cas?slug=' + encodeURIComponent(slug), request.url));
  }

  const session = getCookie(request, 'team_session');
  if (session === TEAM_SESSION_TOKEN) {
    return next();
  }
  return Response.redirect(new URL('/team-login.html', request.url), 307);
}

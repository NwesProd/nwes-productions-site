import { next } from '@vercel/functions';

export const config = {
  matcher: ['/team', '/team.html'],
};

const TEAM_SESSION_TOKEN = '2120615f0760232ccfe896055efc4a0326bf84fa4d09935e';

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function middleware(request) {
  const session = getCookie(request, 'team_session');
  if (session === TEAM_SESSION_TOKEN) {
    return next();
  }
  return Response.redirect(new URL('/team-login.html', request.url), 307);
}

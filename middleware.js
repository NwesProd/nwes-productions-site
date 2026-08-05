import { next } from '@vercel/functions';

export const config = {
  matcher: ['/team', '/team.html'],
};

const TEAM_PASSWORD = 'team';

export default function middleware(request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    const password = decoded.includes(':') ? decoded.split(':').slice(1).join(':') : decoded;
    if (password === TEAM_PASSWORD) {
      return next();
    }
  }

  return new Response('Authentification requise', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Espace equipe nwes"',
    },
  });
}

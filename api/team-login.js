const TEAM_PASSWORD = 'team';
const TEAM_SESSION_TOKEN = '2120615f0760232ccfe896055efc4a0326bf84fa4d09935e';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const { password } = req.body || {};

  if (password !== TEAM_PASSWORD) {
    res.status(401).json({ error: 'Mot de passe incorrect' });
    return;
  }

  res.setHeader(
    'Set-Cookie',
    `team_session=${TEAM_SESSION_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
  res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_TEAM_DB_ID = process.env.NOTION_TEAM_DB_ID;

  if (!NOTION_TOKEN || !NOTION_TEAM_DB_ID) {
    res.status(500).json({ error: 'NOTION_TOKEN ou NOTION_TEAM_DB_ID manquant dans les variables d\'environnement.' });
    return;
  }

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_TEAM_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Visible site internet',
          checkbox: { equals: true },
        },
        sorts: [{ property: 'Prénom', direction: 'ascending' }],
      }),
    });

    if (!notionRes.ok) {
      const details = await notionRes.text();
      res.status(502).json({ error: 'Erreur Notion API', details });
      return;
    }

    const data = await notionRes.json();

    const team = data.results.map((page) => {
      const props = page.properties;

      const name = (props['Prénom']?.title || []).map((t) => t.plain_text).join('');
      const role = (props['Sous-titre site internet']?.rich_text || []).map((t) => t.plain_text).join('');

      const file = props['Photo']?.files?.[0];
      const photoUrl = file ? (file.type === 'external' ? file.external.url : file.file.url) : null;

      return { name, role, photoUrl };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(team);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}

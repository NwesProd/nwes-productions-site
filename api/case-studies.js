export default async function handler(req, res) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const NOTION_CASES_DB_ID = process.env.NOTION_CASES_DB_ID;

  if (!NOTION_TOKEN || !NOTION_CASES_DB_ID) {
    res.status(500).json({ error: 'NOTION_TOKEN ou NOTION_CASES_DB_ID manquant dans les variables d\'environnement.' });
    return;
  }

  const { slug } = req.query;

  try {
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_CASES_DB_ID}/query`, {
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
        sorts: [{ property: 'Date', direction: 'descending' }],
      }),
    });

    if (!notionRes.ok) {
      const details = await notionRes.text();
      res.status(502).json({ error: 'Erreur Notion API', details });
      return;
    }

    const data = await notionRes.json();
    const text = (prop) => (prop?.rich_text || []).map((t) => t.plain_text).join('');

    const videoUrl = (props) => {
      const prop = props['Vidéo'] || props['Vidéo (lien)'];
      if (!prop) return null;
      if (prop.url) return prop.url;
      if (prop.rich_text) return text(prop) || null;
      return null;
    };

    const cases = data.results.map((page) => {
      const props = page.properties;
      return {
        name: (props['Nom du client']?.title || []).map((t) => t.plain_text).join(''),
        slug: text(props['Slug']),
        category: props['Catégorie']?.select?.name || '',
        summary: text(props['Résumé']),
        sector: text(props['Secteur']),
        service: text(props['Prestation']),
        deliverables: text(props['Livrables']),
        context: text(props['Contexte']),
        role: text(props['Notre rôle']),
        videoUrl: videoUrl(props),
        date: props['Date']?.date?.start || null,
      };
    });

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    if (slug) {
      const found = cases.find((c) => c.slug === slug);
      if (!found) {
        res.status(404).json({ error: 'Étude de cas introuvable pour ce slug.' });
        return;
      }
      res.status(200).json(found);
      return;
    }

    res.status(200).json(cases);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
}

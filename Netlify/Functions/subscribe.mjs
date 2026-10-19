// Quiet · Advent — lead capture.
// Holds the Brevo API key server-side so it is never exposed to the browser.
// Two audiences: "individual" (default list) and "church" (group/leader list),
// so church enquiries can be followed up differently from personal signups.

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
  }

  const { name, email, type } = body;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  // Church/group signups go to their own list when one is configured;
  // anything else — including a missing church list — falls back to the default.
  const churchList = process.env.BREVO_CHURCH_LIST_ID;
  const listId = (type === 'church' && churchList) ? churchList : process.env.BREVO_LIST_ID;

  if (!apiKey || !listId) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500 });
  }

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      email,
      attributes: { FIRSTNAME: name, SIGNUP_TYPE: type === 'church' ? 'church' : 'individual' },
      listIds: [Number(listId)],
      updateEnabled: true
    })
  });

  if (res.ok) return new Response(JSON.stringify({ ok: true }), { status: 200 });
  return new Response(JSON.stringify({ error: 'Brevo error' }), { status: 502 });
};

export const config = { path: '/api/subscribe' };

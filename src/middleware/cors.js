export async function corsMiddleware(c, next) {
  const configured = c.env.CORS_ORIGIN || '*';
  const requestOrigin = c.req.header('Origin');
  const allowedOrigins = configured
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const allowOrigin = allowedOrigins.includes('*')
    ? '*'
    : requestOrigin && allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : null;

  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(allowOrigin) });
  }

  await next();
  for (const [key, value] of Object.entries(corsHeaders(allowOrigin))) {
    c.res.headers.set(key, value);
  }
}

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = origin === '*' ? 'false' : 'true';
  }
  return headers;
}

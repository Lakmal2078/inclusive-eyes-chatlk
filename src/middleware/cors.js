export async function corsMiddleware(c, next) {
  const configured = c.env.CORS_ORIGIN || '*';
  const requestOrigin = c.req.header('Origin');
  const allowOrigin = configured === '*' ? '*' : requestOrigin === configured ? requestOrigin : configured;
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(allowOrigin) });
  await next();
  for (const [key, value] of Object.entries(corsHeaders(allowOrigin))) c.res.headers.set(key, value);
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Credentials': origin === '*' ? 'false' : 'true',
    'Access-Control-Max-Age': '86400',
  };
}

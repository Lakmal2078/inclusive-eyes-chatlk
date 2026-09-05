import { cors } from 'hono/cors';
export const corsMiddleware = cors({origin:(origin,c)=>c.env.CORS_ORIGIN==='*'?'*':(origin||c.env.CORS_ORIGIN||'*'),allowMethods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'],allowHeaders:['Authorization','Content-Type'],credentials:true});

// Controlled, opt-in bridge to a separately hosted OpenMausBot workspace.
// The Cloudflare Worker never starts desktop/CLI processes and never proxies arbitrary paths.
const MAX_REPLY_BYTES = 512 * 1024;
const ID = /^[a-zA-Z0-9_-]{1,128}$/;
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {"Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store"}});
}
function error(status, code, message) { return json({error:{code,message}},status); }
export function validatedMausUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let u;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" || !u.hostname || u.username || u.password ||
      u.port || u.pathname !== "/" || u.search || u.hash || u.hostname === "localhost" ||
      u.hostname.endsWith(".localhost") || u.hostname.endsWith(".local") ||
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) || u.hostname.startsWith("["))
    return null;
  return u.origin;
}
function access(env, user) {
  const target = validatedMausUrl(env.OPENMAUSBOT_URL);
  const token = typeof env.OPENMAUSBOT_TOKEN === "string" ? env.OPENMAUSBOT_TOKEN.trim() : "";
  const allow = String(env.OPENMAUSBOT_ALLOWED_EMAILS || "").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  const allowed = !!(user?.email && allow.includes(String(user.email).toLowerCase()));
  return {target, token, allowed, allowConfigured:allow.length > 0};
}
async function upstream(env, user, path, options = {}, fetchImpl = fetch) {
  const {target,token,allowed} = access(env,user);
  if (!target || !token) return {error:error(503,"MAUS_NOT_CONFIGURED","OpenMausBot needs a secure HTTPS server URL and paired session token.")};
  if (!allowed) return {error:error(403,"MAUS_FORBIDDEN","This Cloudflare Access identity is not enabled for OpenMausBot.")};
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),12000);
  try {
    const res = await fetchImpl(target + path, {
      method:options.method || "GET",
      headers:{"Accept":"application/json","Authorization":`Bearer ${token}`, ...(options.body?{"Content-Type":"application/json"}:{})},
      ...(options.body?{body:JSON.stringify(options.body)}:{}),
      redirect:"manual",
      signal:controller.signal
    });
    // Never follow a redirect: an Authorization header must not leave the pinned endpoint.
    if (res.status >= 300 && res.status < 400) return {error:error(502,"MAUS_REDIRECT","OpenMausBot's URL redirected unexpectedly.")};
    if (res.status === 401 || res.status === 403) return {error:error(502,"MAUS_AUTH","OpenMausBot rejected the paired session token.")};
    if (!res.ok) return {error:error(502,"MAUS_UPSTREAM","OpenMausBot could not complete that operation.")};
    const length = Number(res.headers.get("Content-Length") || 0);
    if (length > MAX_REPLY_BYTES) return {error:error(502,"MAUS_RESPONSE_SIZE","OpenMausBot sent an oversized response.")};
    if (!res.body) return {error:error(502,"MAUS_EMPTY","OpenMausBot returned no response.")};
    const reader=res.body.getReader(); const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>MAX_REPLY_BYTES){await reader.cancel();return {error:error(502,"MAUS_RESPONSE_SIZE","OpenMausBot sent an oversized response.")};}
      chunks.push(value);
    }
    const merged=new Uint8Array(size);let pos=0;for(const part of chunks){merged.set(part,pos);pos+=part.byteLength;}
    let data;try{data=JSON.parse(new TextDecoder().decode(merged));}catch{return {error:error(502,"MAUS_INVALID","OpenMausBot returned invalid JSON.")};}
    return {data};
  }catch{return {error:error(502,"MAUS_UNREACHABLE","Could not reach the configured OpenMausBot server.")};}
  finally{clearTimeout(timeout);}
}
const safeId=x=>typeof x === "string" && ID.test(x) ? x : null;
export async function handleOpenMausbot({path,request,env,user,body={},fetchImpl=fetch}) {
  const current=access(env,user);
  if (path === "/api/openmausbot/status" && request.method === "GET")
    return json({configured:!!(current.target && current.token),allowed:current.allowed,
      identityAllowlistConfigured:current.allowConfigured, runtime:"separate-server",
      source:"https://github.com/milind-soni/OpenMausBot"});
  if (!current.target || !current.token)
    return error(503,"MAUS_NOT_CONFIGURED","Set OPENMAUSBOT_URL and OPENMAUSBOT_TOKEN as private Worker secrets.");
  if (!current.allowed) return error(403,"MAUS_FORBIDDEN","This Cloudflare Access identity is not enabled for OpenMausBot.");
  if(path === "/api/openmausbot/bots" && request.method === "GET"){
    const r=await upstream(env,user,"/api/bots?messages=0",{},fetchImpl);if(r.error)return r.error;
    if(!Array.isArray(r.data?.bots))return error(502,"MAUS_INVALID","No bot list was returned.");
    return json({bots:r.data.bots.slice(0,100).map(bot=>({
      id:safeId(bot?.id),name:String(bot?.name||"Unnamed bot").slice(0,120),
      threadId:safeId(bot?.threadId)
    })).filter(bot=>bot.id)});
  }
  if(path === "/api/openmausbot/send" && request.method === "POST"){
    const botId=safeId(body?.botId);const message=typeof body?.text === "string"?body.text.trim():"";
    if(!botId || !message || message.length>5000)return error(400,"MAUS_BAD_REQUEST","Choose a valid bot and a message of 1–5,000 characters.");
    const r=await upstream(env,user,`/api/bots/${encodeURIComponent(botId)}/messages`,{method:"POST",body:{text:message}},fetchImpl);if(r.error)return r.error;
    return json({ok:true,queued:r.data?.queued===true,messageId:safeId(r.data?.messageId),threadId:safeId(r.data?.threadId)});
  }
  if(path === "/api/openmausbot/messages" && request.method === "GET"){
    const id=safeId(new URL(request.url).searchParams.get("threadId"));
    if(!id)return error(400,"MAUS_BAD_REQUEST","A valid conversation ID is required.");
    const r=await upstream(env,user,`/api/threads/${encodeURIComponent(id)}/messages?limit=30`,{},fetchImpl);if(r.error)return r.error;
    if(!Array.isArray(r.data?.messages))return error(502,"MAUS_INVALID","No message list was returned.");
    return json({messages:r.data.messages.filter(m=>m && (m.kind==="text" || !m.kind) && typeof m.text==="string")
      .slice(-30).map(m=>({role:m.role==="bot"?"bot":m.role==="user"?"user":"other",text:m.text.slice(0,5000)}))});
  }
  return error(404,"NOT_FOUND","Unknown OpenMausBot integration endpoint.");
}

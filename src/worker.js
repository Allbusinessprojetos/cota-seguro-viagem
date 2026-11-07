// Cota Seguro Viagem — Worker: serve o site e a rota /api/cotar
import { onRequestPost, onRequestGet } from "../functions/api/cotar.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/cotar") {
      if (request.method === "POST") return onRequestPost({ request });
      return onRequestGet();
    }
    return env.ASSETS.fetch(request);
  },
};

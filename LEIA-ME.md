# Cota Seguro Viagem

Site de vendas de seguro viagem com cotação ao vivo pelo link de parceiro da GTA
(https://seguro.gtawlabel.com.br/hightrip).

## Estrutura
- `public/` — o site (index.html, imagens, robots, sitemap)
- `functions/api/cotar.js` — busca os planos na GTA e devolve os preços
- `src/worker.js` — Worker do Cloudflare: serve `public/` e a rota `/api/cotar`
- `wrangler.jsonc` — configuração do deploy

## Deploy no Cloudflare (Workers)
Workers & Pages → Create → Import a repository → `cota-seguro-viagem`
- Build command: vazio
- Deploy command: `npx wrangler deploy`

Teste: abra `https://SEU-ENDERECO/api/cotar` — deve responder `{"ok":true,...}`.

## Trocar dados
- WhatsApp: `CONFIG.whatsapp` em `public/index.html`
- Parceiro GTA: `PARCEIRO` em `functions/api/cotar.js` e `CONFIG.parceiro` em `public/index.html`
- Domínio: troque `cotaseguroviagem.com.br` em `public/index.html`, `public/sitemap.xml` e `public/robots.txt`

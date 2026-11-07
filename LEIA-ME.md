# Cota Seguro Viagem — deploy no Cloudflare Pages

1. Cloudflare → Workers & Pages → Create → Pages → **Upload assets** (ou conecte o GitHub).
2. Envie a pasta inteira (precisa conter `index.html`, `img/` e `functions/`).
   - Upload direto não roda a pasta `functions/`; para a cotação ao vivo funcionar use **GitHub** ou `npx wrangler pages deploy .`
3. Domínio: aponte cotaseguroviagem.com.br e troque o domínio em `index.html`, `sitemap.xml` e `robots.txt` se for outro.

## O que trocar antes de publicar (procure no index.html)
- `CONFIG.whatsapp` (número com 55 + DDD)
- telefone no JSON-LD (`+55-11-90000-0000`), e-mail, Instagram
- CNPJ da Cota no rodapé (`00.000.000/0001-00`)

## Como a cotação funciona
`functions/api/cotar.js` cria a cotação pelo link de parceiro (https://seguro.gtawlabel.com.br/hightrip), lê os planos
e devolve os preços. "Contratar este plano" abre a emissão na GTA já com siteNome=hightrip (venda na conta do parceiro). Para trocar o parceiro, mude PARCEIRO no topo do arquivo e CONFIG.parceiro no index.html.

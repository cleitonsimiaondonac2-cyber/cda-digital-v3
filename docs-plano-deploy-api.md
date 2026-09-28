# Plano de deploy da API do CDA Digital

> **Estado:** a API **não está em produção**. O GitHub Pages serve apenas ficheiros
> estáticos e não executa Python. Por isso, no site público, `/api/*` devolve **404** e
> o login, o formulário de contacto e o assistente de IA **não funcionam** para quem
> visita o portal.
>
> Este documento explica o problema, o que há já feito no código para o resolver, e qual
> é a recomendação única. Não é um plano de execução automática: é o guião para a decisão.

---

## 1. Qual é o problema, exactamente

| Camada | Onde vive | Como é servida | Estado |
|---|---|---|---|
| `site/` | GitHub Pages | ficheiros estáticos | ✅ live |
| `docs/` | GitHub Pages | cópia de `site/` gerada por `build.sh` | ✅ live |
| `ia/` (FastAPI) | servidor próprio | precisa de Python + reverse proxy | ❌ **ausente** |

O site chama a API através de `site/js/config.js`:

```js
var CDA_API_BASE = (function () {
  if (typeof window.CDA_API_OVERRIDE !== "undefined" && window.CDA_API_OVERRIDE) {
    return window.CDA_API_OVERRIDE;   // 1) override explícito
  }
  return "";                            // 3) vazio = mesma origem
})();
```

Com `CDA_API_BASE = ""` as chamadas são **relativas** (`/api/auth/login`). Isso só
funciona se o `index.html` e a API forem servidos **pela mesma origem**. Como hoje
não são, cada `fetch` vai para `https://cleitonsimiaondonac2-cyber.github.io/api/...`
e devolve 404.

**A boa notícia:** o código já está preparado. `config.js` aceita um override, e
`CDA_IA_API` reutiliza a mesma base. **Não é preciso mexer no frontend** para pôr a
API online — é preciso hospedá-la.

---

## 2. O que já está feito no backend

- **29 rotas** em `ia/admin.py`: documentos, notícias, actividades, membros, mensagens,
  galeria, publicação, auth e contacto.
- **Autenticação** (`ia/auth.py`): PBKDF2, token assinado, sessão por cookie `httponly`.
- **Rate limiting** por IP (`IA_RATE_MAX`/`IA_RATE_WINDOW`, 20 pedidos/60 s), com
  `IA_PROXY_HEADER` para ler o IP real atrás de proxy.
- **SQLite** via SQLAlchemy, com `DATABASE_URL` a permitir migrar para PostgreSQL
  sem alterar código.
- **Bootstrap do admin** no arranque, a partir de `ADMIN_EMAIL` + `ADMIN_SENHA`.
- **LLM opcional**: com `IA_API_KEY` vazio, o assistente funciona em modo local
  (BM25 + fallback honesto) — **sem custo e sem rede**.

---

## 3. Opções de hosting

| Opção | Custo | Dificuldade | Quando faz sentido |
|---|---|---|---|
| **Fly.io** | ~$5/mês (machine `shared-cpu-1x`, 1 GB) | baixa | **recomendado** — deploy com `fly launch`, persistente por volume, com região próxima de Moçambique (`jnb`, Joanesburgo) |
| Render | free tier dorme após 15 min | média | só para experimentar; o plano pago ($7/mês) evita o cold start |
| Railway | ~$5/mês | baixa | alternativa viável ao Fly |
| VPS + nginx | ~$4–8/mês (Hetzner/OVH) + trabalho | **alta** | máximo controlo, mas exige manter o servidor |

### Recomendação: **Fly.io**

Justificação: foi escolhido por ser o mais simples de manter a longo prazo e por ter
uma região em Joanesburgo (`jnb`), o que reduz a latência para Moçambique. O custo
realista é de ~5 USD/mês. A alternativa mais barata (VPS) exige manutenção de
sistema, o que não compensa para um portal institucional.

---

## 4. Passos (Fly.io)

**1. Preparar o código.** O `requirements.txt` existe em `ia/requirements.txt`. No
servidor a aplicação arranca com:

```bash
cd ia && ./venv/bin/python -m uvicorn ia.api:app --host 0.0.0.0 --port 8000
```
(ou os scripts `ia/run.sh` / `ia/start.sh`)

**2. Criar a app e fazer deploy**

```bash
fly launch --no-deploy --region jnb --vm-size shared-cpu-1x --volume-size 1
fly deploy
```

**3. Variáveis de ambiente** (`fly secrets set`)

```bash
fly secrets set AUTH_SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')"
fly secrets set ADMIN_EMAIL=admin@cda-mz.org
fly secrets set ADMIN_SENHA="$(python3 -c 'import secrets;print(secrets.token_urlsafe(24))')"
fly secrets set COOKIE_SECURE=1
fly secrets set IA_ORIGINS=https://cleitonsimiaondonac2-cyber.github.io
fly secrets set IA_PROXY_HEADER=CF-Connecting-IP
```

**4. Persistência** — a BD tem de sobreviver a reinícios:
- `cda.db` num **volume persistente**, **ou** `DATABASE_URL` a apontar para PostgreSQL
  (recomendado a médio prazo, porque SQLite num volume único não escala nem faz
  cópias de segurança fáceis).

**5. Ligar o frontend.** A API fica em `https://<app>.fly.dev`. Para o site apontar
para lá, basta servir isto **antes** de `config.js` em todas as páginas:

```html
<script>window.CDA_API_OVERRIDE = "https://<app>.fly.dev";</script>
```

Alternativa mais limpa: pôr o site atrás do mesmo domínio do backend
(`https://api.cda-mz.org/` a servir a API e `/` a servir o site), e deixar
`CDA_API_BASE = ""` — assim nem há CORS nem domínio cruzado.

---

## 5. Persistência e segredos (não saltar)

- **`AUTH_SECRET` tem de ser estável** entre reinícios. Se mudar, **todas as sessões
  caem** e o utilizador tem de voltar a entrar. Se não for definido, o `auth.py` cria
  `ia/.auth_secret` automaticamente — aceitável em desenvolvimento, **não em
  produção**, porque o segredo passa a viver no disco da máquina.
- **`cda.db` num disco persistente**, ou `DATABASE_URL` → PostgreSQL.
- **`ADMIN_SENHA`** de um segredo gerado, nunca a de exemplo e nunca num gist público.
- **`.env` fora do git.** `ia/.env` já está em `.gitignore`.

---

## 6. Checklist de produção

Antes de anunciar a API como online:

- [ ] `COOKIE_SECURE=1` (obrigatório: a autenticação só pode correr sobre HTTPS)
- [ ] `IA_ORIGINS` **restrito à origem real** do site — nunca `*` em produção
- [ ] `IA_PROXY_HEADER` correcto para o proxy em uso, senão o rate limiting conta
      todos os utilizadores como se fossem o mesmo IP
- [ ] `AUTH_SECRET` definido, forte e **estável**
- [ ] `ADMIN_SENHA` de um segredo, e o `.env` fora do git
- [ ] `IA_STATUS_TOKEN` definido, se `/ia/status` não deve ser público
- [ ] Cópias de segurança da `cda.db` automáticas
- [ ] `COOKIE_SECURE=1` **não** é testado em `http://localhost` (o browser recusa o
      cookie) — testar sempre por HTTPS

---

## 7. Nota sobre o assistente de IA

Não é preciso contratar nenhum LLM para o portal funcionar. Com `IA_API_KEY` vazio o
assistente responde em **modo local** (BM25 sobre os documentos do acervo + fallback
honesto que diz explicitamente "sem modelo de linguagem"). Ter `IA_API_KEY` só melhora
a qualidade das respostas; não é requisito para o site funcionar.

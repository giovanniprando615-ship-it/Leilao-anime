# Deploy

O frontend e o servidor são aplicações separadas. Publique primeiro o servidor e use sua URL pública no frontend.

## Servidor — Railway ou Render

Crie um serviço Node.js a partir do repositório e configure:

| Configuração | Valor |
| --- | --- |
| Diretório raiz | raiz do repositório |
| Build command | `npm install && npm run build:server` |
| Start command | `npm run start --workspace @leilao/server` |

Variáveis:

| Variável | Obrigatória | Exemplo |
| --- | --- | --- |
| `PORT` | Não; Railway/Render definem automaticamente | `3001` |
| `CORS_ORIGIN` | Sim em produção | `https://seu-jogo.vercel.app` |

`CORS_ORIGIN` aceita uma lista de origens separadas por vírgula. Informe as origens exatas do frontend, sem barra final; não use `*` em produção. O endpoint `GET /healthz` retorna `{ "status": "ok" }`.

Mantenha uma única instância do servidor. As salas e os timers são armazenados em memória e não são compartilhados entre réplicas; o `RoomStore` está isolado para permitir uma implementação futura com Redis.

## Frontend — Vercel

Importe o mesmo repositório no Vercel e configure o diretório raiz como `apps/web`. Para que o pacote `shared` seja compilado antes do Next.js, use:

| Configuração | Valor |
| --- | --- |
| Install command | `npm install` |
| Build command | `npm --prefix ../.. run build:web` |

Configure a variável de ambiente em Development, Preview e Production conforme necessário:

| Variável | Obrigatória | Exemplo |
| --- | --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | Sim | `https://seu-servidor.up.railway.app` |

Use `https://` para o endereço público do servidor. Como Socket.IO inicia com reconexão automática, as mesmas URLs devem permanecer acessíveis ao navegador dos dois jogadores.

Após publicar o frontend, adicione sua URL final a `CORS_ORIGIN` no serviço do servidor e faça um novo deploy do servidor.

## Deploy local

Para executar o build completo e os testes:

```powershell
npm install
npm run build
npm test
```

Depois, inicie o servidor e o frontend em terminais separados:

```powershell
npm run start --workspace @leilao/server
npm run start --workspace @leilao/web
```

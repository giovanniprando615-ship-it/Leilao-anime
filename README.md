# Leilão Tático

Aplicação multiplayer de leilão de personagens e simulação de batalha. O monorepo contém o frontend Next.js, o servidor Express/Socket.IO e o pacote compartilhado de tipos, roster e regras. O elenco traz 64 personagens de One Piece, Naruto e Black Clover; antes de criar a sala, o anfitrião escolhe qual dos três animes define o elenco daquele leilão. Os retratos locais estão em `apps/web/public/images/anime/`, separados por série e associados aos IDs do roster.

## Desenvolvimento local

Requer Node.js 20.9 ou superior e npm.

```powershell
npm install
npm run dev --workspace @leilao/server
```

Em outro terminal:

```powershell
npm run dev --workspace @leilao/web
```

Abra `http://localhost:3000`. O servidor escuta em `http://localhost:3001`. As variáveis opcionais de desenvolvimento estão em [`apps/server/.env.example`](./apps/server/.env.example) e [`apps/web/.env.example`](./apps/web/.env.example).

### Testar em dois dispositivos na mesma rede

Descubra o IPv4 do computador que executa os servidores com `ipconfig`. Nos exemplos abaixo, substitua `192.168.1.25` pelo IPv4 encontrado e mantenha cada comando em seu próprio terminal PowerShell:

```powershell
# Terminal do servidor
$env:CORS_ORIGIN = "http://localhost:3000,http://192.168.1.25:3000"
npm run dev --workspace @leilao/server
```

```powershell
# Terminal do frontend
$env:NEXT_PUBLIC_SERVER_URL = "http://192.168.1.25:3001"
npm run dev --workspace @leilao/web -- --hostname 0.0.0.0
```

Abra `http://192.168.1.25:3000` no outro dispositivo. Ambos precisam estar na mesma rede, e o Firewall do Windows deve permitir conexões de entrada nas portas 3000 e 3001. Cada jogador deve usar um navegador ou perfil separado para manter seu próprio `localStorage`.

## Verificação

```powershell
npm run build
npm test
npm audit
```

Veja [`DEPLOY.md`](./DEPLOY.md) para configurar Railway/Render e Vercel.

> As salas são mantidas em memória nesta versão. Execute uma única instância do servidor; múltiplas réplicas e persistência exigem substituir `InMemoryRoomStore` por um armazenamento compartilhado, como Redis.

> Projeto de fã independente, não oficial e sem afiliação. Personagens, nomes, marcas e imagens pertencem exclusivamente aos respectivos titulares de direitos. O uso no projeto é demonstrativo e não implica endosso ou parceria.

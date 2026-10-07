# Leilão Tático

Aplicação multiplayer de leilão de personagens e simulação de batalha. O monorepo contém o frontend Next.js, o servidor Express/Socket.IO e o pacote compartilhado de tipos, roster e regras. O elenco traz 64 personagens de One Piece, Naruto e Black Clover; antes de criar a sala, o anfitrião escolhe qual dos três animes define o elenco daquele leilão. Os retratos locais estão em `apps/web/public/images/anime/`, separados por série e associados aos IDs do roster. O preço sugerido foi removido do roster compartilhado: ele não é uma regra nem entra no cálculo da batalha.

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

As salas podem ser abertas diretamente por `http://localhost:3000/sala/CODIGO`. O criador escolhe o anime no formulário e pode alterá-lo no lobby antes do leilão começar; depois do início, o elenco fica travado. No lobby, cada jogador confirma que está pronto antes do criador iniciar. O botão **Sair da sala** pede confirmação e, após o início, concede vitória por W.O. ao jogador que permaneceu. Em caso de sala inexistente ou reconexão demorada, a interface oferece recuperação ou retorno ao início.

A preferência de tema claro/escuro é local por jogador; a paleta de destaque acompanha o anime selecionado. Use o link de convite copiado no lobby para compartilhar a sala.

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

### Fórmula e balanceamento da batalha

Para cada cenário, o motor calcula a média dos atributos ponderados dos personagens presentes no time. Um time vazio tem pontuação base zero. O total é essa base mais sinergias, counters e ajustes do cenário:

| Cenário | Poder | Velocidade | Resistência | Escala logística |
| --- | ---: | ---: | ---: | ---: |
| Batalha padrão | 1,20 | 1,10 | 0,70 | 18 |
| Luta até a morte | 0,90 | 0,65 | 1,45 | 20 |

Os pesos e bônus vêm de `packages/shared/src/rules.ts`: o par Asta + Yuno vale 16 pontos; grupos com pelo menos 3 membros valem 4 pontos por membro; counters por tags valem 8–12 pontos por correspondência (limitados pela quantidade menor dos dois lados). Na luta até a morte, regeneração concede +7 por personagem e exaustão penaliza −2 por personagem sem regeneração.

A chance do time A é `P(A) = 1 / (1 + e^(-(totalA-totalB)/escala))`; a do time B é `1 − P(A)`. Pontuações iguais, inclusive dois times vazios, resultam em 50% para cada time; não há resultado de empate separado nesta versão (`drawProbability = 0`). Os fatores individuais mostram a mudança em pontos percentuais comparando a chance real com a chance recalculada sem aquele modificador.

As probabilidades gerais são a média aritmética dos dois cenários (50% para cada cenário). O vencedor, porém, é sorteado no servidor usando a probabilidade do cenário escolhido pelo anfitrião. O sorteio usa um PRNG Mulberry32 com seed aleatória de 32 bits gerada pelo servidor e salva no estado da sala e no resultado, permitindo reproduzir o sorteio. O cliente só apresenta os cálculos enviados pelo servidor.

> As salas são mantidas em memória nesta versão. Execute uma única instância do servidor; múltiplas réplicas e persistência exigem substituir `InMemoryRoomStore` por um armazenamento compartilhado, como Redis.

> Projeto de fã independente, não oficial e sem afiliação. Personagens, nomes, marcas e imagens pertencem exclusivamente aos respectivos titulares de direitos. O uso no projeto é demonstrativo e não implica endosso ou parceria.

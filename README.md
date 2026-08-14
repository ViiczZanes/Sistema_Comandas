# Sistema PDV — Pedidos por QR Code, Mesa e Comanda

Implementação do sistema descrito em [`sistema_pdv_qr_code_comandas.md`](../sistema_pdv_qr_code_comandas.md):
cliente pede pelo celular escaneando o QR Code da própria mesa, identifica a
comanda física que recebeu na entrada, os pedidos caem na cozinha em tempo
real, e no final ele escaneia a comanda para ver e fechar a conta.

Regra principal do sistema (mantida em todo o código):

- **QR da mesa → onde entregar** (`Order.tableId`)
- **QR da comanda → quem paga** (`Order.comandaId`)

## O que está implementado

Segue as Fases 1–6 do MVP descrito na seção 21 do documento:

| Fase | Conteúdo | Status |
| --- | --- | --- |
| 1 | Cadastro (mesas, comandas, produtos, categorias, usuários) | ✅ |
| 2 | Geração e impressão dos QR Codes | ✅ |
| 3 | Cardápio, adicionais, carrinho, observações | ✅ |
| 4 | Identificar mesa/comanda, criar pedido | ✅ |
| 5 | Cozinha (KDS) com atualização em tempo real | ✅ |
| 6 | PDV: mesas, comandas, fechamento, pagamento | ✅ |
| 7 | PIX integrado, estoque, cupons, fidelidade, impressão automática | ⛔ fora do escopo desta versão |

## Design system

Interface pensada para uso real em produção, não só funcional:

- **Paleta de marca** em `src/app/globals.css` (`--color-brand-*`, escala
  gerada em `oklch` para progressão de luminosidade consistente) —
  registrada via `@theme` do Tailwind v4, então vira utilities normais
  (`bg-brand-600`, `text-brand-700`...). Pra trocar a cor da marca, mexa só
  ali.
- **Componentes base** em `src/components/ui/`: `Button`, `Badge`, `Input`/
  `Select`/`Field`, `Card`, `EmptyState`, `Spinner`/`Skeleton`. Toda tela
  nova deveria montar em cima desses em vez de estilizar `<input>`/`<button>`
  crus.
- **Toast e diálogo de confirmação** (`src/lib/toastStore.ts`,
  `src/lib/confirmStore.ts` + `<Toaster/>`/`<ConfirmDialogHost/>` montados
  uma vez em `layout.tsx`): substituem `alert()`/`confirm()` do browser em
  toda a aplicação. Uso: `toast.success("...")`, `await confirmAction({
  title, danger })`.
- **Ícones**: `lucide-react` em todo lugar, nunca emoji solto em botão/ação
  (emoji continua ok como conteúdo do cardápio/status, ex: 🟢🔴🟡).
- **Cozinha (KDS) é dark on purpose**: tela pensada pra ficar num monitor
  fixo da cozinha, então usa alto contraste e realce de urgência por tempo
  (`src/lib/orderAge.ts` — pedido fica amarelo depois de 6 min, vermelho
  depois de 12 min parado na fila).

## Stack

- **Next.js 16** (App Router, Route Handlers) + **React 19** + **TypeScript**
- **Prisma 7** como ORM — hoje sobre **SQLite** (`@prisma/adapter-libsql`, sem
  precisar compilar nada nativo), pronto para trocar para **PostgreSQL** em
  produção (ver seção abaixo)
- **Tailwind CSS v4**
- Autenticação própria (sessão em cookie httpOnly + tabela `Session`) para a
  equipe (Admin / PDV / Cozinha) — o cliente nunca faz login, ele usa o
  token da mesa/comanda
- Tempo real via **Server-Sent Events** (cozinha e PDV)
- `qrcode` para gerar os QR Codes das mesas e comandas

> Este projeto usa **Next.js 16**, que teve mudanças relevantes de API em
> relação a versões anteriores (params/searchParams assíncronos, Turbopack
> por padrão, etc). Ao mexer no código, vale conferir
> `node_modules/next/dist/docs/` antes de assumir um comportamento de
> versões anteriores.

## Rodando localmente

```bash
npm install
cp .env.example .env        # já vem configurado para SQLite local
npm run db:migrate           # cria/atualiza o banco (prisma/dev.db)
npm run db:seed              # popula com dados de exemplo
npm run dev
```

Acesse `http://localhost:3000`.

### Usuários de teste (criados pelo seed)

| Papel | E-mail | Senha |
| --- | --- | --- |
| Administrador | admin@restaurante.com | admin123 |
| PDV / Garçom | garcom@restaurante.com | garcom123 |
| Cozinha | cozinha@restaurante.com | cozinha123 |

O seed também cria 8 mesas, 10 comandas (#151–#160) e um cardápio de
exemplo (hambúrgueres com adicionais, porções, bebidas, sobremesa).

### Simulando o fluxo do cliente sem escanear um QR Code de verdade

1. Vá em **Administração → Mesas → Imprimir QR Codes** (logado como admin)
   para ver o link de cada mesa, ou pegue o link direto em
   **Administração → Mesas** (o token está na URL do QR).
2. Abra `/m/<token-da-mesa>` no navegador — é a mesma tela que abriria ao
   escanear o QR físico.
3. Informe o número de uma comanda (ex: `151`) para continuar.
4. Monte um pedido e envie — ele aparece imediatamente em `/kitchen` (login
   como cozinha) e o status da mesa muda em `/pdv` (login como garçom/admin).

## Estrutura de pastas

```
prisma/
  schema.prisma        # modelo de dados (comentado, pensado p/ Postgres)
  seed.ts               # dados de exemplo
src/
  lib/                  # prisma client, auth, dinheiro, realtime, qrcode
  components/           # componentes de UI compartilhados
  app/
    m/[tableToken]/...            # fluxo do cliente (mesa → comanda → cardápio)
    c/[token]/                    # conta final da comanda (visualizar/pagar)
    kitchen/                      # KDS da cozinha (tempo real)
    pdv/                          # painel do PDV (mesas, comandas, pagamento)
    admin/                        # cadastros e impressão de QR Codes
    api/                          # Route Handlers (REST + SSE)
```

## Como o tempo real funciona (e sua limitação)

A cozinha e o PDV assinam um endpoint de **Server-Sent Events**
(`/api/kitchen/stream` e `/api/pdv/stream`) que recebe eventos de um barramento
em memória (`src/lib/events.ts`) toda vez que um pedido é criado, muda de
status, uma comanda é fechada, etc.

Isso funciona muito bem com **um único processo Node** rodando o Next.js —
válido tanto em desenvolvimento quanto em produção com uma única instância
(`next start` em um único container, por exemplo). Se um dia o sistema
precisar rodar em **múltiplas instâncias** atrás de um load balancer, esse
pub/sub em memória para de funcionar entre processos diferentes. Nesse
momento, troque a implementação de `src/lib/events.ts` por algo compartilhado
entre processos — o caminho mais natural, já estando em PostgreSQL, é usar
`LISTEN`/`NOTIFY`; alternativas gerenciadas incluem Pusher, Ably ou Supabase
Realtime. A interface pública (`publish`/`subscribe`) foi pensada para que
essa troca não exija mudar quem publica ou assina eventos.

## Pagamento: caixa físico, sem garçom circulando

O pedido é 100% autônomo (mesa → comanda → cardápio → cozinha, sem
intervenção humana). O pagamento, por decisão do dono do sistema, é feito
num **caixa físico fixo**: o cliente leva a própria comanda até lá no final.

Por isso o `/pdv` tem uma busca rápida "Caixa: buscar comanda pelo número"
na tela inicial — o operador do caixa digita o número impresso na comanda
(sem precisar saber em qual mesa ela estava) e cai direto em
`/pdv/comanda/[número]` para conferir o consumo e registrar o pagamento.

## Segurança da comanda

Como no documento original (seção 13), a comanda nunca é identificada
apenas pelo número sequencial: o QR Code físico e a URL de consulta usam um
token (`Comanda.token`), então não dá para trocar `/c/151` por `/c/152` na
barra de endereço e ver a conta de outra pessoa.

A única forma de resolver uma comanda pelo número (para quem prefere digitar
em vez de escanear) é `POST /api/public/comandas/resolve`, e ela só resolve
comandas que estejam livres ou já sentadas **na mesma mesa** de quem está
perguntando — ou seja, na pior hipótese alguém só consegue tentar "adivinhar"
entre as poucas comandas do próprio grupo, nunca do restaurante inteiro.

## Migrando para PostgreSQL

O schema já foi desenhado pensando nisso desde o início (ver comentário no
topo de `prisma/schema.prisma`): IDs em `cuid()` (não autoincrement),
dinheiro sempre em centavos (`Int`), sem nenhum recurso exclusivo do SQLite.
Os passos:

1. **Suba um banco PostgreSQL** (local, Docker, Neon, Supabase, RDS, etc.)
   e pegue a connection string.

2. **Troque o provider no schema:**

   ```prisma
   // prisma/schema.prisma
   datasource db {
     provider = "postgresql"
   }
   ```

3. **Troque o driver adapter em `src/lib/prisma.ts`:**

   ```bash
   npm install @prisma/adapter-pg pg
   npm uninstall @prisma/adapter-libsql @libsql/client
   ```

   ```ts
   // src/lib/prisma.ts
   import { PrismaClient } from "@/generated/prisma/client";
   import { PrismaPg } from "@prisma/adapter-pg";

   function createPrismaClient() {
     const adapter = new PrismaPg({
       connectionString: process.env.DATABASE_URL!,
     });
     return new PrismaClient({ adapter });
   }
   ```

   O resto do arquivo (singleton, cache em dev) não muda.

4. **Atualize `DATABASE_URL`** no `.env` de produção para a connection
   string do Postgres (formato `postgresql://usuario:senha@host:5432/banco`).

5. **Gere as migrations para Postgres.** As migrations atuais têm SQL de
   SQLite e não se aplicam a Postgres — apague `prisma/migrations/` e gere
   de novo, agora apontando para o banco Postgres:

   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init
   ```

6. Nenhuma outra parte da aplicação muda: toda a lógica de negócio usa a
   API do Prisma Client (`prisma.order.create(...)`, etc.), não SQL cru nem
   nada específico de SQLite.

7. (Opcional, mas recomendado em produção com mais de uma instância) trocar
   o pub/sub em memória de `src/lib/events.ts` por `LISTEN`/`NOTIFY` do
   Postgres, como descrito na seção acima.

## Identificação da mesa e da comanda

- **Mesa**: a câmera *nativa* do celular escaneia o QR físico e abre a URL
  direto (`/m/<token>`) — não tem nada rodando dentro do navegador aí.
- **Comanda**: dentro do app, `/m/<token>/comanda` abre a câmera *pelo
  navegador* (`src/components/QrCodeScanner.tsx`, biblioteca `qr-scanner`)
  pra ler o QR da comanda física — evita o cliente digitar (e errar, ou
  digitar de propósito) o número de uma comanda que não é a dele. Se a
  câmera não estiver disponível (sem permissão, sem câmera, ou — importante
  — fora de um contexto seguro, ver abaixo) cai automaticamente para o
  campo de digitar o número, que é a alternativa que o próprio documento já
  descreve na seção 12.

### HTTPS é obrigatório pra câmera funcionar

`getUserMedia` (acesso à câmera) só funciona em **contexto seguro**:
`https://` ou `http://localhost`. Em `http://` puro — como o acesso direto
pelo IP da rede local que usamos pra testar (`http://192.168.1.x:3000`) —
o navegador bloqueia a câmera silenciosamente, e o app cai no fallback de
digitar o número (nunca trava). Pra usar o scanner de verdade em produção,
o domínio do restaurante precisa ter HTTPS (comum em qualquer hospedagem
séria — Vercel, Netlify, um domínio próprio com Let's Encrypt/Caddy, etc.).
Em `localhost` (testando no navegador do próprio PC) a câmera funciona
mesmo sem HTTPS, porque `localhost` conta como contexto seguro.

## O que fica para depois (Fase 7 do documento)

Deliberadamente fora desta versão, para manter o escopo do MVP:

- Pagamento online / PIX integrado (hoje o cliente só *sinaliza* que quer
  pagar — quem registra o pagamento é o staff no PDV)
- Impressão automática de comandas na cozinha
- Controle de estoque
- Controle de caixa
- Cupons, promoções e fidelidade

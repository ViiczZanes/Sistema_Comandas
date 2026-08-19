import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Não importamos src/lib/auth.ts aqui de propósito: esse módulo tem
// `import "server-only"` no topo, que só funciona dentro do bundler do
// Next.js (lança erro se rodado num script Node puro como este seed).
function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seed: restaurante...");
  // A migration multi-tenant já cria e popula esse restaurante (id fixo
  // 'rst_default', slug 'principal') pra qualquer dado que já existia antes
  // dela — este upsert só garante que ele também existe num banco novo
  // (sem histórico anterior), sem duplicar em nenhum dos dois casos.
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "principal" },
    update: {},
    create: { slug: "principal" },
  });
  const restaurantId = restaurant.id;

  console.log("Seed: usuários...");
  const users = [
    { name: "Administrador", email: "admin@restaurante.com", password: "admin123", role: "ADMIN" as const },
    { name: "Garçom", email: "garcom@restaurante.com", password: "garcom123", role: "WAITER" as const },
    { name: "Cozinha", email: "cozinha@restaurante.com", password: "cozinha123", role: "KITCHEN" as const },
  ];
  for (const u of users) {
    const passwordHash = await hashPassword(u.password);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        restaurantId,
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
  }

  console.log("Seed: mesas...");
  for (let n = 1; n <= 8; n++) {
    await prisma.restaurantTable.upsert({
      where: { restaurantId_number: { restaurantId, number: n } },
      update: {},
      create: { restaurantId, number: n },
    });
  }

  console.log("Seed: comandas...");
  for (let n = 151; n <= 160; n++) {
    await prisma.comanda.upsert({
      where: { restaurantId_number: { restaurantId, number: n } },
      update: {},
      create: { restaurantId, number: n },
    });
  }

  console.log("Seed: cardápio...");

  const burgers = await prisma.category.upsert({
    where: { id: "seed-cat-burgers" },
    update: {},
    create: { id: "seed-cat-burgers", restaurantId, name: "🍔 Hambúrgueres", sortOrder: 1 },
  });
  const portions = await prisma.category.upsert({
    where: { id: "seed-cat-portions" },
    update: {},
    create: { id: "seed-cat-portions", restaurantId, name: "🍟 Porções", sortOrder: 2 },
  });
  const drinks = await prisma.category.upsert({
    where: { id: "seed-cat-drinks" },
    update: {},
    create: { id: "seed-cat-drinks", restaurantId, name: "🥤 Bebidas", sortOrder: 3 },
  });
  const desserts = await prisma.category.upsert({
    where: { id: "seed-cat-desserts" },
    update: {},
    create: { id: "seed-cat-desserts", restaurantId, name: "🍰 Sobremesas", sortOrder: 4 },
  });

  const xBacon = await prisma.product.upsert({
    where: { id: "seed-prod-xbacon" },
    update: {},
    create: {
      id: "seed-prod-xbacon",
      restaurantId,
      categoryId: burgers.id,
      name: "X-Bacon",
      description: "Pão, hambúrguer, queijo, bacon, alface, tomate",
      priceCents: 2990,
    },
  });
  await prisma.product.upsert({
    where: { id: "seed-prod-xburger" },
    update: {},
    create: {
      id: "seed-prod-xburger",
      restaurantId,
      categoryId: burgers.id,
      name: "X-Burger",
      description: "Pão, hambúrguer, queijo, alface, tomate",
      priceCents: 2490,
    },
  });

  const xBaconOptions = [
    { id: "seed-opt-bacon", name: "Bacon", type: "ADDITIONAL" as const, priceCents: 500 },
    { id: "seed-opt-cheddar", name: "Cheddar", type: "ADDITIONAL" as const, priceCents: 400 },
    { id: "seed-opt-ovo", name: "Ovo", type: "ADDITIONAL" as const, priceCents: 300 },
    { id: "seed-opt-cebola", name: "Cebola", type: "REMOVABLE" as const, priceCents: 0 },
    { id: "seed-opt-tomate", name: "Tomate", type: "REMOVABLE" as const, priceCents: 0 },
  ];
  for (const opt of xBaconOptions) {
    await prisma.productOption.upsert({
      where: { id: opt.id },
      update: {},
      create: { ...opt, productId: xBacon.id },
    });
  }

  await prisma.product.upsert({
    where: { id: "seed-prod-batata" },
    update: {},
    create: {
      id: "seed-prod-batata",
      restaurantId,
      categoryId: portions.id,
      name: "Batata Frita",
      description: "Porção individual",
      priceCents: 1800,
    },
  });

  await prisma.product.upsert({
    where: { id: "seed-prod-coca" },
    update: {},
    create: {
      id: "seed-prod-coca",
      restaurantId,
      categoryId: drinks.id,
      name: "Coca-Cola",
      description: "Lata 350ml",
      priceCents: 600,
    },
  });
  await prisma.product.upsert({
    where: { id: "seed-prod-suco" },
    update: {},
    create: {
      id: "seed-prod-suco",
      restaurantId,
      categoryId: drinks.id,
      name: "Suco de Laranja",
      description: "Copo 300ml",
      priceCents: 800,
    },
  });

  await prisma.product.upsert({
    where: { id: "seed-prod-pudim" },
    update: {},
    create: {
      id: "seed-prod-pudim",
      restaurantId,
      categoryId: desserts.id,
      name: "Pudim",
      description: "Fatia individual",
      priceCents: 1200,
    },
  });

  console.log("Seed concluído.");
  console.log("Restaurante:", restaurant.slug, `(${restaurantId})`);
  console.log("Login administrador: admin@restaurante.com / admin123");
  console.log("Login garçom: garcom@restaurante.com / garcom123");
  console.log("Login cozinha: cozinha@restaurante.com / cozinha123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

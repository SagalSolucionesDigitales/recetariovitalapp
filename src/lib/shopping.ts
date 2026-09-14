// Utilities for consolidating ingredients from a weekly plan
export type Comida = { nombre: string; ingredientes?: string[] };
export type Dia = { dia: string; desayuno: Comida; almuerzo: Comida; cena: Comida; postre: Comida };
export type PlanJson = { semana?: string; dias?: Dia[] };

const CATEGORIES: Array<{ key: string; label: string; match: RegExp }> = [
  {
    key: "proteinas",
    label: "Proteínas",
    match:
      /\b(pollo|pechuga|res|carne|atún|atun|salmón|salmon|pescado|huevo|huevos|tofu|frijol|lenteja|garbanzo|jamón|jamon|pavo|queso panela|queso fresco|requesón|requeson)\b/i,
  },
  {
    key: "verduras",
    label: "Verduras y hojas verdes",
    match:
      /\b(espinaca|acelga|lechuga|kale|brócoli|brocoli|coliflor|calabacita|calabaza|nopal|nopales|zanahoria|jitomate|tomate|cebolla|chile|pimiento|pepino|chayote|ejote|champiñon|champiñón|champinon|apio|rábano|rabano|ajo)\b/i,
  },
  {
    key: "frutas",
    label: "Frutas",
    match:
      /\b(manzana|pera|fresa|frambuesa|arándano|arandano|plátano|platano|papaya|guayaba|piña|piñ|naranja|mandarina|limón|limon|aguacate|durazno|melón|melon|sandía|sandia|kiwi|toronja|jicama|jícama)\b/i,
  },
  {
    key: "granos",
    label: "Granos y semillas",
    match:
      /\b(avena|quinoa|arroz integral|tortilla|amaranto|chía|chia|linaza|nuez|nueces|almendra|cacahuate|pepita|pepitas|ajonjolí|ajonjoli|pan integral)\b/i,
  },
  {
    key: "lacteos",
    label: "Lácteos y huevo",
    match: /\b(leche|yogur|yogurt|queso|crema|mantequilla)\b/i,
  },
  {
    key: "abarrotes",
    label: "Abarrotes y aceites",
    match:
      /\b(aceite|sal|pimienta|vinagre|salsa|mostaza|miel|canela|comino|orégano|oregano|laurel|caldo|frijol)\b/i,
  },
];

function normalize(line: string): string {
  return line
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[-•·]\s*/, "");
}

function categorize(line: string): string {
  for (const c of CATEGORIES) if (c.match.test(line)) return c.key;
  return "otros";
}

export function buildShoppingList(
  plan: PlanJson | undefined,
): Array<{ key: string; label: string; items: string[] }> {
  const buckets = new Map<string, Set<string>>();
  const labels = new Map<string, string>([
    ...CATEGORIES.map((c) => [c.key, c.label] as const),
    ["otros", "Otros"],
  ]);
  if (!plan?.dias) return [];
  for (const d of plan.dias) {
    for (const meal of [d?.desayuno, d?.almuerzo, d?.cena, d?.postre]) {
      for (const raw of meal?.ingredientes ?? []) {
        const item = normalize(raw);
        if (!item) continue;
        const key = categorize(item);
        if (!buckets.has(key)) buckets.set(key, new Set());
        buckets.get(key)!.add(item);
      }
    }
  }
  const order = [...CATEGORIES.map((c) => c.key), "otros"];
  return order
    .filter((k) => buckets.has(k))
    .map((k) => ({
      key: k,
      label: labels.get(k) ?? k,
      items: [...buckets.get(k)!].sort((a, b) => a.localeCompare(b, "es")),
    }));
}

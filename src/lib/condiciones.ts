export type CondicionSalud =
  | "prediabetes"
  | "cardiovascular"
  | "sindrome_metabolico"
  | "control_peso";

export const CONDICIONES: Array<{ id: CondicionSalud; title: string; sub: string; label: string }> =
  [
    {
      id: "prediabetes",
      title: "Prediabetes o diabetes tipo 2",
      sub: "Control de glucosa e índice glucémico",
      label: "Prediabetes / Diabetes tipo 2",
    },
    {
      id: "cardiovascular",
      title: "Enfermedad cardiovascular",
      sub: "Colesterol, presión y salud del corazón",
      label: "Cardiovascular",
    },
    {
      id: "sindrome_metabolico",
      title: "Síndrome metabólico",
      sub: "Cintura, triglicéridos y resistencia a la insulina",
      label: "Síndrome metabólico",
    },
    {
      id: "control_peso",
      title: "Control de peso y obesidad",
      sub: "Saciedad, calorías y hábitos sostenibles",
      label: "Control de peso",
    },
  ];

export function condicionLabel(c: string | null | undefined): string {
  return CONDICIONES.find((x) => x.id === c)?.label ?? "Dieta Mediterránea";
}

export type Pais =
  | "MX"
  | "CO"
  | "AR"
  | "CL"
  | "PE"
  | "EC"
  | "VE"
  | "GT"
  | "CR"
  | "PA"
  | "DO"
  | "HN"
  | "SV"
  | "NI"
  | "BO"
  | "PY"
  | "UY"
  | "ES";

export const PAISES: Array<{ id: Pais; nombre: string }> = [
  { id: "MX", nombre: "México" },
  { id: "CO", nombre: "Colombia" },
  { id: "AR", nombre: "Argentina" },
  { id: "CL", nombre: "Chile" },
  { id: "PE", nombre: "Perú" },
  { id: "EC", nombre: "Ecuador" },
  { id: "VE", nombre: "Venezuela" },
  { id: "GT", nombre: "Guatemala" },
  { id: "CR", nombre: "Costa Rica" },
  { id: "PA", nombre: "Panamá" },
  { id: "DO", nombre: "República Dominicana" },
  { id: "HN", nombre: "Honduras" },
  { id: "SV", nombre: "El Salvador" },
  { id: "NI", nombre: "Nicaragua" },
  { id: "BO", nombre: "Bolivia" },
  { id: "PY", nombre: "Paraguay" },
  { id: "UY", nombre: "Uruguay" },
  { id: "ES", nombre: "España" },
];

export function paisLabel(id: string | null | undefined): string {
  return PAISES.find((p) => p.id === id)?.nombre ?? "tu país";
}

type Opcion = { id: string; title: string; sub: string; label: string };

export const GLUCOSA_OPCIONES: Opcion[] = [
  {
    id: "100-110",
    title: "Entre 100 y 110 mg/dL",
    sub: "Prediabetes leve — con ajustes se revierte fácilmente",
    label: "100–110 mg/dL",
  },
  {
    id: "111-125",
    title: "Entre 111 y 125 mg/dL",
    sub: "Prediabetes moderada — el plan marcará una diferencia real",
    label: "111–125 mg/dL",
  },
  {
    id: "no-se",
    title: "No lo sé exactamente",
    sub: "Sin problema, igual armamos tu plan",
    label: "Sin dato exacto",
  },
];

export const COLESTEROL_OPCIONES: Opcion[] = [
  {
    id: "menos200",
    title: "Menos de 200 mg/dL",
    sub: "Nivel deseable",
    label: "< 200 mg/dL (deseable)",
  },
  {
    id: "200-239",
    title: "Entre 200 y 239 mg/dL",
    sub: "Nivel límite alto",
    label: "200–239 mg/dL (límite alto)",
  },
  {
    id: "mas240",
    title: "240 mg/dL o más",
    sub: "Nivel alto — priorizamos grasas saludables",
    label: "≥ 240 mg/dL (alto)",
  },
  {
    id: "no-se",
    title: "No lo sé exactamente",
    sub: "Sin problema, igual armamos tu plan",
    label: "Sin dato exacto",
  },
];

export const CINTURA_OPCIONES: Opcion[] = [
  { id: "menos80", title: "Menos de 80 cm", sub: "Menor riesgo metabólico", label: "< 80 cm" },
  {
    id: "80-99",
    title: "Entre 80 y 99 cm",
    sub: "Riesgo moderado — momento ideal para ajustar hábitos",
    label: "80–99 cm",
  },
  {
    id: "mas100",
    title: "100 cm o más",
    sub: "Riesgo elevado — priorizamos control de porciones",
    label: "≥ 100 cm",
  },
  {
    id: "no-se",
    title: "No lo sé exactamente",
    sub: "Sin problema, lo estimamos con tus otros datos",
    label: "Sin dato exacto",
  },
];

export const RESTRICCION_OTRA_ID = "otra";

export const RESTRICCIONES_OPCIONES: Array<{ id: string; l: string }> = [
  { id: "gluten", l: "🌾 Gluten" },
  { id: "lacteos", l: "🥛 Lácteos" },
  { id: "mariscos", l: "🦐 Mariscos" },
  { id: "cerdo", l: "🥩 Cerdo" },
  { id: "picante", l: "🌶️ Picante" },
  { id: "ninguno", l: "✅ Ninguno por ahora" },
  { id: RESTRICCION_OTRA_ID, l: "➕ Otra, ¿cuál?" },
];

const RESTRICCIONES_IDS_FIJOS = new Set(
  RESTRICCIONES_OPCIONES.map((o) => o.id).filter((id) => id !== RESTRICCION_OTRA_ID),
);

/** The free-text value entered via "Otra, ¿cuál?" (stored inline in the restricciones array), if any. */
export function extraerRestriccionOtra(restricciones: string[]): string {
  return restricciones.find((r) => !RESTRICCIONES_IDS_FIJOS.has(r)) ?? "";
}

export const TIEMPO_OPCIONES: Opcion[] = [
  {
    id: "menos15",
    title: "Menos de 15 minutos",
    sub: "Recetas rápidas, ingredientes simples",
    label: "< 15 min",
  },
  {
    id: "15-30",
    title: "Entre 15 y 30 minutos",
    sub: "El rango ideal para variedad y nutrición",
    label: "15–30 min",
  },
  {
    id: "mas30",
    title: "Más de 30 minutos",
    sub: "Recetas más elaboradas y con mayor variedad",
    label: "> 30 min",
  },
];

export const PERSONAS_OPCIONES: Opcion[] = [
  {
    id: "1",
    title: "Solo para mí",
    sub: "Porciones individuales, menos desperdicio",
    label: "1 persona",
  },
  {
    id: "2",
    title: "Para 2 personas",
    sub: "Porciones dobles, compras eficientes",
    label: "2 personas",
  },
  {
    id: "3+",
    title: "Para 3 o más",
    sub: "Porciones familiares, recetas rindidoras",
    label: "3 o más",
  },
];

export const PRESUPUESTO_OPCIONES: Opcion[] = [
  {
    id: "menos500",
    title: "Menos de $500 MXN",
    sub: "Recetas económicas con ingredientes de mercado local",
    label: "< $500 MXN",
  },
  {
    id: "500-1000",
    title: "Entre $500 y $1,000 MXN",
    sub: "Buen balance entre variedad y costo",
    label: "$500–$1,000 MXN",
  },
  {
    id: "mas1000",
    title: "Más de $1,000 MXN",
    sub: "Mayor variedad y opciones especializadas",
    label: "> $1,000 MXN",
  },
];

export function calcularIMC(pesoKg: number, estaturaCm: number): number {
  const m = estaturaCm / 100;
  return pesoKg / (m * m);
}

export type ImcCategoria = "bajo_peso" | "normal" | "sobrepeso" | "obesidad";

export function categorizarIMC(imc: number): ImcCategoria {
  if (imc < 18.5) return "bajo_peso";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  return "obesidad";
}

export const IMC_LABELS: Record<ImcCategoria, string> = {
  bajo_peso: "Bajo peso",
  normal: "Peso normal",
  sobrepeso: "Sobrepeso",
  obesidad: "Obesidad",
};

interface PerfilIndicadores {
  condicion_salud: string | null;
  glucosa_referencia: string | null;
  colesterol_nivel: string | null;
  circunferencia_cintura: string | null;
  peso_kg: number | null;
  estatura_cm: number | null;
}

export function indicadorTexto(p: PerfilIndicadores): string {
  switch (p.condicion_salud) {
    case "cardiovascular":
      return `Colesterol total: ${COLESTEROL_OPCIONES.find((o) => o.id === p.colesterol_nivel)?.label ?? "sin dato"}`;
    case "sindrome_metabolico":
      return `Circunferencia de cintura: ${CINTURA_OPCIONES.find((o) => o.id === p.circunferencia_cintura)?.label ?? "sin dato"}`;
    case "control_peso": {
      if (p.peso_kg && p.estatura_cm) {
        const imc = calcularIMC(p.peso_kg, p.estatura_cm);
        return `IMC: ${imc.toFixed(1)} (${IMC_LABELS[categorizarIMC(imc)]})`;
      }
      return "IMC: sin dato";
    }
    default:
      return `Glucosa en ayunas: ${GLUCOSA_OPCIONES.find((o) => o.id === p.glucosa_referencia)?.label ?? "sin dato"}`;
  }
}

type Explanation = { title: string; content: string };

/* ── Score / Diagnóstico (4 sub-scores) ── */

export const SCORE_EXPLANATIONS: Record<string, Explanation> = {
  diversification: {
    title: "¿Qué mide la Diversificación?",
    content:
      "Evalúa qué tan distribuido está tu capital entre distintos activos y sectores. " +
      "Una alta concentración en pocas posiciones aumenta el desvío estándar del portfolio, " +
      "exponiendo tu capital a riesgos idiosincráticos que podrían evitarse distribuyendo mejor las posiciones.",
  },
  risk_match: {
    title: "¿Qué es el Risk Match?",
    content:
      "Mide qué tan alineada está la volatilidad y el beta de tu portfolio con el perfil de riesgo que definiste. " +
      "Un portfolio conservador con acciones muy volátiles, o uno agresivo solo en renta fija, " +
      "genera un desajuste que puede llevar a decisiones emocionales en momentos de estrés del mercado.",
  },
  risk_adjusted_return: {
    title: "¿Qué es el Sharpe Ratio?",
    content:
      "El ratio de Sharpe mide cuánto retorno adicional obtenés por cada unidad de riesgo asumida. " +
      "Un portfolio puede tener alto retorno pero si lo logra con volatilidad excesiva, no es eficiente. " +
      "Optimizar Sharpe busca el máximo rendimiento con el mínimo riesgo posible.",
  },
  downside_protection: {
    title: "¿Qué es la Protección a la Baja?",
    content:
      "Evalúa qué tan preparado está tu portfolio para escenarios adversos del mercado. " +
      "Incluye la correlación entre tus activos (si todos caen juntos, no hay protección) " +
      "y el peso de activos defensivos como bonos, que amortiguan las caídas.",
  },
};

/* ── Allocation moves ── */

export const ALLOCATION_EXPLANATIONS: Record<string, Explanation> = {
  increase_bonds: {
    title: "¿Por qué aumentar Renta Fija?",
    content:
      "Los bonos actúan como estabilizadores del portfolio. Generan flujo de caja predecible a través de cupones " +
      "y típicamente se mueven en dirección opuesta a las acciones en momentos de crisis, " +
      "reduciendo la volatilidad total y protegiendo el capital.",
  },
  decrease_bonds: {
    title: "¿Por qué reducir Renta Fija?",
    content:
      "Con un horizonte largo y alta tolerancia al riesgo, un exceso de bonos puede limitar el crecimiento del capital. " +
      "Históricamente las acciones superan a los bonos en períodos largos, " +
      "por lo que reducir renta fija permite capturar mayor apreciación.",
  },
  increase_us_equities: {
    title: "¿Por qué aumentar Acciones US?",
    content:
      "Las acciones estadounidenses ofrecen exposición a las empresas más grandes e innovadoras del mundo. " +
      "Para perfiles con horizonte largo, representan el principal motor de crecimiento del capital, " +
      "con un retorno histórico promedio del 10% anual.",
  },
  decrease_us_equities: {
    title: "¿Por qué reducir Acciones US?",
    content:
      "Una sobreexposición a acciones US aumenta la volatilidad del portfolio y lo concentra en un solo mercado. " +
      "Reducirla permite redistribuir capital hacia activos más estables o diversificar geográficamente, " +
      "mejorando la relación riesgo-retorno.",
  },
  increase_intl_equities: {
    title: "¿Por qué diversificar internacionalmente?",
    content:
      "Los mercados internacionales no siempre se mueven igual que el mercado estadounidense. " +
      "Agregar acciones de mercados desarrollados y emergentes reduce la correlación total del portfolio, " +
      "capturando oportunidades de crecimiento en economías con distintos ciclos.",
  },
  increase_cash: {
    title: "¿Por qué mantener efectivo?",
    content:
      "El efectivo brinda liquidez inmediata para emergencias o para aprovechar oportunidades de compra " +
      "durante caídas del mercado. También reduce la volatilidad total del portfolio " +
      "y actúa como reserva cuando la incertidumbre es alta.",
  },
};

/* ── Instrument picks (por campo 'improves') ── */

export const INSTRUMENT_EXPLANATIONS: Record<string, Explanation> = {
  Diversificación: {
    title: "¿Por qué mejora la diversificación?",
    content:
      "Agregar activos poco correlacionados con tus posiciones actuales reduce la volatilidad sin sacrificar retorno esperado. " +
      "Es el único 'almuerzo gratis' de las finanzas: reducir riesgo sin reducir retorno.",
  },
  "Risk Match": {
    title: "¿Por qué mejora el Risk Match?",
    content:
      "Este instrumento acerca el beta y la volatilidad de tu portfolio al nivel que definiste en tu perfil. " +
      "Un portfolio alineado al perfil reduce la probabilidad de que tomes decisiones emocionales " +
      "en momentos de alta volatilidad.",
  },
  Sharpe: {
    title: "¿Por qué mejora el Sharpe?",
    content:
      "Este activo mejora la eficiencia riesgo-retorno del portfolio. " +
      "Agrega retorno esperado sin incrementar proporcionalmente el riesgo, " +
      "o reduce la volatilidad sin sacrificar rendimiento.",
  },
  Downside: {
    title: "¿Por qué mejora la protección a la baja?",
    content:
      "Este instrumento tiene baja correlación con tus otras posiciones o es un activo defensivo " +
      "que tiende a mantener su valor (o subir) cuando el mercado cae, " +
      "actuando como seguro en escenarios adversos.",
  },
  default: {
    title: "¿Por qué este instrumento?",
    content:
      "Este instrumento fue seleccionado para mejorar la estructura general de tu portfolio, " +
      "optimizando la combinación de retorno esperado, riesgo y protección " +
      "según tu perfil de inversor.",
  },
};

/* ── Sell-side explanations ── */

export const SELL_EXPLANATIONS: Explanation = {
  title: "¿Por qué vender este activo?",
  content:
    "Vender posiciones sobrerepresentadas reduce la concentración del portfolio. " +
    "La alta concentración aumenta el desvío estándar y expone el capital a riesgo específico de un activo, " +
    "que puede eliminarse redistribuyendo entre más posiciones.",
};

/* ── Allocation general ── */

export const ALLOCATION_GENERAL: Explanation = {
  title: "¿Qué es Asset Allocation?",
  content:
    "La distribución entre clases de activos (acciones, bonos, efectivo) es la decisión de inversión más importante. " +
    "Estudios demuestran que explica más del 90% de la variabilidad del retorno de un portfolio a largo plazo. " +
    "La proporción ideal depende de tu horizonte, tolerancia al riesgo y objetivos.",
};

/* ── Onboarding questions ── */

export const ONBOARDING_EXPLANATIONS: Record<string, Explanation> = {
  investment_horizon: {
    title: "¿Por qué importa el horizonte?",
    content:
      "El tiempo es el factor más importante en la construcción de un portfolio. " +
      "Con horizontes largos podés tolerar mayor volatilidad porque las caídas temporales se recuperan. " +
      "Con horizontes cortos, la prioridad es preservar capital.",
  },
  risk_tolerance: {
    title: "¿Por qué importa la tolerancia al riesgo?",
    content:
      "Tu tolerancia define cuánta volatilidad podés soportar sin tomar decisiones impulsivas. " +
      "Un portfolio demasiado arriesgado para tu perfil puede llevarte a vender en el peor momento. " +
      "Alinear el riesgo a tu perfil protege de errores emocionales.",
  },
  objective: {
    title: "¿Por qué importa el objetivo?",
    content:
      "Preservar capital, generar ingresos y crecimiento agresivo requieren estrategias muy distintas. " +
      "El objetivo determina qué mix de activos es óptimo: más bonos para ingresos, " +
      "más acciones para crecimiento, o un balance para preservación.",
  },
  drawdown_reaction: {
    title: "¿Qué revela esta pregunta?",
    content:
      "Tu reacción ante una caída del 20% revela tu verdadera capacidad de asumir riesgo, " +
      "más allá de lo que crees teóricamente. Si venderías en pánico, tu portfolio necesita ser más conservador " +
      "para evitar cristalizar pérdidas en el peor momento.",
  },
  patrimony_percentage: {
    title: "¿Por qué importa el % de patrimonio?",
    content:
      "Si este portfolio representa la mayor parte de tus ahorros, el riesgo real es mayor. " +
      "Una caída del 30% en el 100% de tu patrimonio es devastadora, pero en el 10% es manejable. " +
      "Esto ajusta la agresividad óptima del portfolio.",
  },
  liquidity_need: {
    title: "¿Por qué importa la liquidez?",
    content:
      "Si necesitás acceso frecuente al dinero, el portfolio debe incluir activos líquidos y de baja volatilidad. " +
      "Invertir capital que podés necesitar a corto plazo en activos volátiles te fuerza a vender " +
      "en momentos desfavorables.",
  },
  income_vs_growth: {
    title: "¿Ingreso vs Crecimiento?",
    content:
      "Los activos de ingreso (bonos, dividendos) generan flujo de caja regular pero crecimiento menor. " +
      "Los activos de crecimiento (acciones growth) reinvierten en la empresa y se aprecian más a largo plazo. " +
      "El balance depende de si necesitás dinero hoy o querés maximizar valor futuro.",
  },
  bond_preference: {
    title: "¿Por qué importa la preferencia de bonos?",
    content:
      "Los bonos soberanos son más seguros pero rinden menos. Los corporativos ofrecen mayor rendimiento " +
      "pero con riesgo crediticio. La preferencia afecta la relación riesgo-retorno " +
      "de la porción de renta fija de tu portfolio.",
  },
  geo_preference: {
    title: "¿Por qué importa la preferencia geográfica?",
    content:
      "Diversificar entre regiones reduce la exposición a riesgos locales (políticos, económicos, regulatorios). " +
      "Un portfolio concentrado en un solo país está expuesto a eventos que no afectan a mercados globales.",
  },
  esg_preference: {
    title: "¿Qué son los criterios ESG?",
    content:
      "Los criterios ambientales, sociales y de gobernanza (ESG) permiten invertir alineado a tus valores. " +
      "Estudios recientes muestran que empresas con buenas prácticas ESG tienden a tener menor riesgo operativo " +
      "y rendimientos competitivos a largo plazo.",
  },
};

/* ── Allocation split (onboarding review) ── */

export const ALLOCATION_SPLIT: Explanation = {
  title: "¿Por qué esta distribución?",
  content:
    "La proporción de acciones, bonos y efectivo se calcula según tu perfil de riesgo, horizonte temporal y objetivos. " +
    "Un perfil conservador asigna más a bonos y efectivo para estabilidad. " +
    "Uno agresivo asigna más a acciones para maximizar crecimiento a largo plazo.",
};

/** Commercial orientation; these are learning areas, not invented catalog products. */
export const learningPaths = [
  {
    id: 'ia',
    number: '01',
    category: 'IA aplicada',
    title: 'Usar IA en tu trabajo',
    description:
      'Preparar materiales, analizar información y mejorar tareas de tu profesión con criterio.',
    detail: 'Inteligencia artificial aplicada a profesiones y actividades.',
    terms: ['inteligencia artificial', 'ia aplicada'],
  },
  {
    id: 'web',
    number: '02',
    category: 'Desarrollo web',
    title: 'Crear tu primera web',
    description:
      'Entender cómo se construye un sitio y llevar una idea a una página que puedas mantener.',
    detail: 'Programación y desarrollo de páginas web.',
    terms: ['desarrollo', 'programacion', 'web'],
  },
  {
    id: 'automatizaciones',
    number: '03',
    category: 'Automatizaciones',
    title: 'Resolver una tarea repetitiva',
    description: 'Conectar herramientas y ordenar procesos sencillos que hoy te llevan tiempo.',
    detail: 'Automatizaciones sencillas y prácticas.',
    terms: ['automatizacion', 'automatizaciones'],
  },
  {
    id: 'herramientas',
    number: '04',
    category: 'Herramientas digitales',
    title: 'Organizar mejor tu día a día',
    description: 'Elegir herramientas para producir, comunicar y trabajar con más orden.',
    detail: 'Herramientas digitales para profesionales, emprendedores y empresas.',
    terms: ['herramientas', 'productividad', 'diseno', 'datos'],
  },
] as const;
export const resourceFormats = [
  {
    number: '01',
    title: 'Guías y manuales',
    format: 'PDF',
    text: 'Material de consulta para acompañar lo aprendido y volver a los pasos que necesitás.',
  },
  {
    number: '02',
    title: 'Plantillas y presentaciones',
    format: 'EDITABLES',
    text: 'Una base de trabajo que puedas adaptar a tus proyectos, materiales o procesos.',
  },
  {
    number: '03',
    title: 'Kits de trabajo',
    format: 'VARIOS FORMATOS',
    text: 'Recursos reunidos alrededor de una tarea: IA aplicada, desarrollo web o automatización.',
  },
] as const;
export const businessServices = [
  {
    number: '01',
    title: 'Sitios web',
    text: 'Una presencia digital pensada para tu actividad, con contenido claro y una experiencia simple.',
  },
  {
    number: '02',
    title: 'Sistemas y plataformas',
    text: 'Herramientas a medida para organizar información y acompañar la forma de trabajar de tu equipo.',
  },
  {
    number: '03',
    title: 'Automatización de procesos',
    text: 'Conexiones entre herramientas que reduzcan pasos repetidos y mantengan los procesos bajo control.',
  },
  {
    number: '04',
    title: 'Integración de IA',
    text: 'Aplicaciones concretas de inteligencia artificial, con revisión humana y objetivos definidos.',
  },
] as const;
export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}
export function matchesLearningPath(category: string, goal: string) {
  const path = learningPaths.find((item) => item.id === goal);
  return !path || path.terms.some((term) => normalizeSearch(category).includes(term));
}

// Esquemas de contenido (Zod) del Estándar Web MCCO v2. El motor de contenido y los agentes
// escriben Markdown con este frontmatter; el build falla si falta algo → no existen posts a medias.
import { z } from 'astro:content';

const link = z.object({ anchor: z.string().min(3), url: z.string().min(1) });

export const blogSchema = z.object({
  title: z.string().min(10).max(90),
  seo_title: z.string().max(65).optional(),
  description: z.string().min(70).max(160),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  category: z.string().default('Guía'),
  author: z.object({ name: z.string(), role: z.string() }).optional(),
  hero: z.object({ src: z.string(), alt: z.string().min(10) }).optional(),
  // Cápsula de respuesta (GEO): 3-4 frases autocontenidas que responden la pregunta del título.
  capsule: z.string().min(120).max(700),
  // FAQ: respuestas de 40-80 palabras, citables sueltas.
  faq: z.array(z.object({ q: z.string().min(8), a: z.string().min(40).max(700) })).min(3).max(8),
  // 2-3 páginas de servicio propias (interlinking editorial).
  related: z.array(link).min(1).max(6),
  // 1 cross-link a la web hermana pertinente.
  sister: link.extend({ site: z.string() }).optional(),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  // "mcco-content-engine vX" | "codex" | "claude" | "humano"
  generated_by: z.string().optional(),
});

export const casoSchema = z.object({
  title: z.string().min(10).max(90),
  description: z.string().min(70).max(160),
  date: z.coerce.date(),
  // Solo clientes nombrables (lista en AGENTS.md del sitio).
  client: z.string(),
  sector: z.string(),
  // escenario = ilustrativo, con disclaimer visible; real = proyecto ejecutado.
  kind: z.enum(['real', 'escenario']),
  summary: z.string().min(120),
  deliverables: z.array(z.string()).min(1),
  // Toda cifra publicada lleva su fuente.
  metrics: z.array(z.object({ label: z.string(), value: z.string(), source: z.string() })).default([]),
  hero: z.object({ src: z.string(), alt: z.string().min(10) }).optional(),
  gallery: z.array(z.object({ src: z.string(), alt: z.string().min(10) })).default([]),
  related: z.array(link).default([]),
  draft: z.boolean().default(false),
});

export const guiaSchema = blogSchema;

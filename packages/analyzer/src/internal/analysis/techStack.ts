import { TechStackItem } from '../pipeline/types';

const IMPORT_HINTS: { re: RegExp; name: string; role: string }[] = [
  { re: /\bexpress\b/i, name: 'Express', role: 'Web framework' },
  { re: /\bfastify\b/i, name: 'Fastify', role: 'Web framework' },
  { re: /\bkoa\b/i, name: 'Koa', role: 'Web framework' },
  { re: /\bnestjs\b|@nestjs\//i, name: 'NestJS', role: 'Web framework' },
  { re: /\breact\b/i, name: 'React', role: 'UI library' },
  { re: /\bnext\b|next\/?/i, name: 'Next.js', role: 'Fullstack framework' },
  { re: /\bvue\b/i, name: 'Vue', role: 'UI framework' },
  { re: /\bsvelte\b/i, name: 'Svelte', role: 'UI framework' },
  { re: /\bmongoose\b/i, name: 'Mongoose', role: 'ODM' },
  { re: /\bmongodb\b/i, name: 'MongoDB', role: 'Database' },
  { re: /\bprisma\b/i, name: 'Prisma', role: 'ORM' },
  { re: /\btypeorm\b/i, name: 'TypeORM', role: 'ORM' },
  { re: /\bpostgres\b|pg\b/i, name: 'PostgreSQL', role: 'Database' },
  { re: /\bmysql\b/i, name: 'MySQL', role: 'Database' },
  { re: /\bredis\b/i, name: 'Redis', role: 'Cache / datastore' },
  { re: /\bsocket\.io\b/i, name: 'Socket.IO', role: 'Realtime' },
  { re: /\bgraphql\b/i, name: 'GraphQL', role: 'API layer' },
  { re: /\baxios\b/i, name: 'Axios', role: 'HTTP client' },
  { re: /\bzod\b/i, name: 'Zod', role: 'Validation' },
  { re: /\bjsonwebtoken\b|jwt\b/i, name: 'JWT', role: 'Auth' },
  { re: /\bpassport\b/i, name: 'Passport', role: 'Auth' },
  { re: /\bbcrypt\b/i, name: 'bcrypt', role: 'Password hashing' },
  { re: /\bvitest\b/i, name: 'Vitest', role: 'Testing' },
  { re: /\bjest\b/i, name: 'Jest', role: 'Testing' },
  { re: /\beslint\b/i, name: 'ESLint', role: 'Linting' },
  { re: /\bprettier\b/i, name: 'Prettier', role: 'Formatting' },
  { re: /\bturbo\b|turborepo\b/i, name: 'Turborepo', role: 'Monorepo build system' },
  { re: /\bpnpm\b/i, name: 'pnpm', role: 'Package manager' },
  { re: /\bdocker\b/i, name: 'Docker', role: 'Containerization' },
];

function uniqByName(items: TechStackItem[]): TechStackItem[] {
  const seen = new Set<string>();
  const out: TechStackItem[] = [];
  for (const it of items) {
    const key = it.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/**
 * Heuristic tech stack detection based on imports/keywords/dependency names.
 * Intentionally conservative: only return items with evidence.
 */
export function detectTechStack(importHints: string[]): TechStackItem[] {
  const joined = importHints.join('\n');
  const hits: TechStackItem[] = [];

  // Runtime baseline
  hits.push({ name: 'Node.js', role: 'Runtime', confidence: 0.6, evidence: ['Detected via JS/TS codebase heuristics'] });

  for (const hint of IMPORT_HINTS) {
    if (hint.re.test(joined)) {
      hits.push({
        name: hint.name,
        role: hint.role,
        confidence: 0.75,
        evidence: [`Matched: ${hint.re.source}`],
      });
    }
  }

  return uniqByName(hits);
}


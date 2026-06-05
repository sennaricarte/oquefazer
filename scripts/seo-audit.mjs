import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = path.join(root, 'src/content/blog');

const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.mdx'));
const stats = {
	total: files.length,
	published: 0,
	withHero: 0,
	withAreaLink: 0,
	withCluster: 0,
	withRelated: 0,
	bodyH1: 0,
	servicePosts: 0,
	duplicateTagsInFm: 0,
	shortBody: 0,
};

const titles = new Map();
const slugPatterns = { oQueFaz: 0, guia: 0, ficha: 0 };

for (const f of files) {
	const c = fs.readFileSync(path.join(blogDir, f), 'utf8');
	const draft = /^draft:\s*true/m.test(c);
	if (!draft) stats.published++;
	if (c.includes('heroImage:')) stats.withHero++;
	if (c.includes('/areas/')) stats.withAreaLink++;
	if (/^cluster:/m.test(c)) stats.withCluster++;
	if (/relatedProfession:/m.test(c)) stats.withRelated++;

	const fm = c.match(/^title:\s*["']?([^"\n]+)/m);
	const title = fm?.[1]?.replace(/["']$/, '').trim();
	if (title) titles.set(title, (titles.get(title) || 0) + 1);

	const body = c.split(/^---\r?\n/m).slice(2).join('---');
	if (/^#\s/m.test(body.trim())) stats.bodyH1++;
	if (/desentupid|fossa|dedetiz|cupins|esgoto/i.test(f)) stats.servicePosts++;

	const tagBlock = c.match(/^tags:\s*\n((?:\s+-\s+.*\n)+)/m);
	if (tagBlock) {
		const tags = [...tagBlock[1].matchAll(/-\s+"([^"]+)"/g)].map((m) => m[1]);
		const keys = tags.map((t) =>
			t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
		);
		if (keys.length !== new Set(keys).size) stats.duplicateTagsInFm++;
	}

	const words = body.replace(/[#*_\[\]()>-]/g, ' ').split(/\s+/).filter(Boolean).length;
	if (!draft && words < 200) stats.shortBody++;

	if (/^o-que-faz-/i.test(f)) slugPatterns.oQueFaz++;
	if (/guia/i.test(f)) slugPatterns.guia++;
	if (!/^o-que-faz-/i.test(f) && !/guia/i.test(f)) slugPatterns.ficha++;
}

const dupTitles = [...titles.entries()].filter(([, n]) => n > 1);

console.log(JSON.stringify({ ...stats, heroPct: Math.round((stats.withHero / stats.total) * 100), areaLinkPct: Math.round((stats.withAreaLink / stats.published) * 100), bodyH1Pct: Math.round((stats.bodyH1 / stats.total) * 100), dupTitles: dupTitles.length, dupExamples: dupTitles.slice(0, 8), slugPatterns }, null, 2));

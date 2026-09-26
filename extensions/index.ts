/**
 * pi-wiki — the team's shared knowledge base.
 *
 *   wiki_write  — create/update a page (topic → content)
 *   wiki_read   — read a page
 *   wiki_list   — all pages
 *   wiki_search — full-text search across pages
 *
 * Souls share knowledge beyond per-soul memory: decisions, runbooks,
 * project notes. Stored at $PI_WIKI_DIR (default
 * ~/.local/state/telegram-agent/wiki) as <topic>.md files.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Type } from "typebox";

const DIR =
	process.env.PI_WIKI_DIR ??
	join(homedir(), ".local/state/telegram-agent/wiki");

const page = (t: string) => join(DIR, `${t.replace(/[^\w\- ]/g, "").trim()}.md`);

export default function piWiki(pi: ExtensionAPI) {
	pi.registerTool({
		name: "wiki_write",
		label: "Wiki Write",
		description:
			"Write/update a wiki page — shared team knowledge (runbooks, decisions, project notes). Persists across all souls.",
		promptSnippet: "Write a wiki page",
		parameters: Type.Object({
			topic: Type.String({ description: "page name" }),
			content: Type.String(),
		}),
		async execute(_id, p) {
			mkdirSync(DIR, { recursive: true });
			writeFileSync(page(p.topic), p.content);
			return {
				content: [{
					type: "text" as const,
					text: `wiki page '${p.topic}' saved`,
				}],
				details: null,
			};
		},
	});

	pi.registerTool({
		name: "wiki_read",
		label: "Wiki Read",
		description: "Read a wiki page by topic.",
		parameters: Type.Object({ topic: Type.String() }),
		async execute(_id, p) {
			const f = page(p.topic);
			if (!existsSync(f))
				return { content: [{ type: "text" as const, text: `(no page '${p.topic}')` }], details: null };
			return {
				content: [{ type: "text" as const, text: readFileSync(f, "utf-8") }],
				details: null,
			};
		},
	});

	pi.registerTool({
		name: "wiki_list",
		label: "Wiki List",
		description: "List all wiki pages.",
		parameters: Type.Object({}),
		async execute() {
			mkdirSync(DIR, { recursive: true });
			const pages = readdirSync(DIR).filter((f) => f.endsWith(".md"));
			return {
				content: [{
					type: "text" as const,
					text: pages.length ? pages.join("\n") : "(empty wiki)",
				}],
				details: null,
			};
		},
	});

	pi.registerTool({
		name: "wiki_search",
		label: "Wiki Search",
		description: "Full-text search across all wiki pages.",
		parameters: Type.Object({ query: Type.String() }),
		async execute(_id, p) {
			mkdirSync(DIR, { recursive: true });
			const hits: string[] = [];
			for (const f of readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
				const src = readFileSync(join(DIR, f), "utf-8");
				if (src.toLowerCase().includes(p.query.toLowerCase()) || f.includes(p.query)) {
					const line = src.split("\n").find((l) =>
						l.toLowerCase().includes(p.query.toLowerCase()),
					);
					hits.push(`- ${f.replace(/\.md$/, "")} — ${line?.slice(0, 80) ?? ""}`);
				}
			}
			return {
				content: [{
					type: "text" as const,
					text: hits.length ? hits.join("\n") : `(no matches for '${p.query}')`,
				}],
				details: null,
			};
		},
	});
}

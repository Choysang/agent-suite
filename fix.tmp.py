import sys
def sub(p, a, b, count=1):
    s = open(p, encoding='utf-8').read()
    assert s.count(a) >= 1, (p, a[:60])
    s = s.replace(a, b, count)
    open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 1. citations are the bracketed form only
sub('src/core/voice.ts', "const ID = /\bv(\d+)\.(\d+)\b/g;", "/** A citation is always bracketed, `[v7.3]`, so version strings like `v24.1` never count. */\nconst CITE = /\[(v\d+\.\d+)\]/g;")
sub('src/core/voice.ts', "  return [...text.matchAll(ID)].map(m => m[0]);", "  return [...text.matchAll(CITE)].map(m => m[1]!);")
sub('src/core/voice.ts', "  return text.replace(new RegExp(`\\bv${from}\\.(\\d+)\\b`, 'g'), `v${to}.$1`);", "  return text.replace(new RegExp(`\\[v${from}\\.(\\d+)\\]`, 'g'), `[v${to}.$1]`);")

# 7. any `## lane:` line opens a lane; the name is validated, never silently merged
sub('src/core/draft.ts', "const LANE = /^## lane:\s*(\S+)\s*$/;", "const LANE = /^## lane:\s*(.*?)\s*$/;")

# 11. atomic registry write
sub('src/adapters/registry.ts', "import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';", "import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';")
sub('src/adapters/registry.ts', "    writeFileSync(this.file, JSON.stringify(all, null, 2) + '\n');", "    const tmp = `${this.file}.${process.pid}.tmp`;\n    writeFileSync(tmp, JSON.stringify(all, null, 2) + '\n');\n    renameSync(tmp, this.file);")
print('ok')

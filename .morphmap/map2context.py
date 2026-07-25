#!/usr/bin/env python3
"""YAML mindmap → compact markdown (orchestrator context view).
Usage: .venv/bin/python3 .morphmap/map2context.py [yaml_path]
"""

import sys, yaml

EMOJI = {'pending':'⬜','in_progress':'🔄','done':'✅','failed':'❌','blocked':'🔴'}

def compact(path):
    with open(path) as f:
        d = yaml.safe_load(f)

    out = [f"# {d.get('project','MorphMap')} — {d.get('status','?')}",""]

    for c in d.get('context',[]):
        out.append(f"- {c}")
    out.append("")

    for name, b in d.get('branches',{}).items():
        status = b.get('status','pending')
        tag = b.get('tag','module')
        archived = b.get('archived','')
        coll = b.get('collapsed',False)
        blocked = f' [BLOCKED: {b["blocked_reason"]}]' if status=='blocked' and b.get('blocked_reason') else ''

        if archived:
            out.append(f'## {name} ✅ → {archived}')
            if b.get('summary'):
                out.append(f'  {b["summary"]}')
            continue

        if tag == 'log':
            out.append(f'## {name} [{tag}]')
        else:
            out.append(f'## {name} {EMOJI.get(status,"⬜")} [{tag}]{blocked}')

        if coll:
            n = len(b.get('leaves', b.get('content', [])))
            out.append(f'  ({n} items collapsed)')
            continue

        leaves = b.get('leaves',[])
        if leaves:
            for leaf in leaves:
                e = EMOJI.get(leaf.get('status','pending'),'⬜')
                n = f' · {leaf["note"]}' if leaf.get('note') else ''
                out.append(f'- {e} {leaf["text"]}{n}')
        else:
            for item in b.get('content',[]):
                out.append(f'- {item}')
        out.append("")

    dec = d.get('decisions',{})
    if dec:
        out.append('## decisions ⬜ [log]')
        out.append(f'  → {dec["file"]} ({dec["count"]} entries: {dec["recent"]} ✅ recent, {dec["archived"]} 📦 archived)')
        if dec.get('latest'):
            out.append(f'  Latest: {" · ".join(dec["latest"])}')

    return '\n'.join(out)

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else '.morphmap/morphmap.mindmap.yaml'
    print(compact(path))

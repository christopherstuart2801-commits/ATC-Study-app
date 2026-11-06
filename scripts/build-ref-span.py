#!/usr/bin/env python3
"""Compact source-highlight anchors for JO 7110.65BB and NFG FACMAN July 2026.

Reads site/data/para-index.json (already extracted public text) and the SEC_IDX
pages embedded in site/index.html. Emits site/data/ref-span.json: for each
section whose paragraph-index page matches the section index, a short exact
prefix of that paragraph. No pages are invented and no new publication text
is written. The page number is copied from SEC_IDX only as a guard so the
reader will not apply the phrase on a different PDF page.
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
HTML = os.path.join(ROOT, 'site', 'index.html')
PARA = os.path.join(ROOT, 'site', 'data', 'para-index.json')
OUT = os.path.join(ROOT, 'site', 'data', 'ref-span.json')

def norm_heading(s):
    s = s.replace('\u2212', '-').replace('\u2013', '-').replace('\u2014', '-')
    s = s.replace('\u2019', "'").replace('\u2018', "'")
    return re.sub(r'\s+', ' ', s).strip().upper()

def phrase_of(text):
    t = text.replace('\u2212', '-').replace('\u2013', '-').replace('\u2014', '-')
    t = t.replace('\u2019', "'").replace('\u2018', "'")
    t = re.sub(r'\s+', ' ', t).strip()
    if not t or re.search(r'\.{4,}', t):
        return ''
    if re.match(r'^\d+-\d+-\d+', t):
        return ''
    t = re.sub(r'^[a-z]\.\s+', '', t)
    cut = len(t)
    for pat in (r'\bNOTE\b', r'\bREFERENCE\b', r'\bPHRASEOLOGY\b', r'\bEXAMPLE\b'):
        m = re.search(pat, t)
        if m and m.start() >= 40:
            cut = min(cut, m.start())
    t = t[:cut].strip(' -;')
    t = re.sub(r'\s+[a-z]\.$', '', t).strip()
    if len(t) > 88:
        t = re.sub(r'\s+\S*$', '', t[:88])
    t = re.sub(r'\s+[a-z]\.$', '', t).strip(' -;:')
    if len(t) < 28 or len(t.split()) < 5:
        return ''
    return t

def load_sec_idx(html):
    i = html.find('const SEC_IDX=')
    j = html.find('const SEC_PUBS', i)
    if i < 0 or j < 0:
        sys.exit('SEC_IDX not found')
    raw = html[i + len('const SEC_IDX='):j].strip().rstrip(';')
    return json.loads(raw)

def main():
    html = open(HTML, encoding='utf-8').read()
    sec = load_sec_idx(html)
    para = json.load(open(PARA, encoding='utf-8'))
    out = {}
    skipped = 0
    for e in para:
        ent = (sec.get(e['p']) or {}).get(e['k'])
        if not ent or ent[1] != e['pg']:
            skipped += 1
            continue
        if norm_heading(ent[0]) != norm_heading(e['h']):
            skipped += 1
            continue
        q = phrase_of(e.get('t') or '')
        if not q:
            skipped += 1
            continue
        out.setdefault(e['p'], {})[e['k']] = {'q': q, 'pg': ent[1]}
    json.dump(out, open(OUT, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
    n = sum(len(v) for v in out.values())
    print('ref-span', n, 'skipped', skipped, 'bytes', os.path.getsize(OUT), {k: len(v) for k, v in out.items()})

if __name__ == '__main__':
    main()

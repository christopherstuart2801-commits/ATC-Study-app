#!/usr/bin/env python3
# v0.8.22 ask-section-jump: builds SEC_IDX (section headings + PDF pages) from the pub PDFs in site/docs.
# Prereq: per-page text in /tmp/secidx/<PDF-name>/<page>.txt  (pdftotext -q -f N -l N site/docs/<PDF>.pdf ...).
# Output: /workspace/build-brief/patch9/secidx.json (embedded into index.html as const SEC_IDX).
import os, re, json, glob
B='/tmp/secidx'
D='[-\u2212\u2013\u2010\u2011]'
def pages(d):
    n=len(glob.glob(f'{B}/{d}/*.txt'))
    return [(i, open(f'{B}/{d}/{i}.txt', encoding='utf-8', errors='replace').read()) for i in range(1, n+1)]
def norm(s): return re.sub(r'[\u2212\u2013\u2010\u2011]','-',s)
def is_toc(t): return 'Table of Contents' in t[:400] or 'TABLE OF CONTENTS' in t[:400] or len(re.findall(r'^\d+[-\u2212\u2013]\d+[-\u2212\u2013]\d+\.\s.*(\. ){3,}', t, re.M))>=3
def toc_line(l): return bool(re.search(r'(\. ){3,}|\.{4,}', l))
APPL=re.compile(r'^(TERMINAL|EN ROUTE|OCEANIC|TERMINAL AND EN ROUTE|EN ROUTE AND OCEANIC|TERMINAL/EN ROUTE)\.?$')
STOP=re.compile(r'^([a-z]\.|\(\d+\)|\d+\.|NOTE|REFERENCE|PHRASEOLOGY|EXAMPLE|FAA|JO |NFG|JULY|Chapter|Section|Appendix)', re.I)
WR=[]
def sec_dbg(m): return m.group(1)+'-'+m.group(2)+'-'+m.group(3)
NOFOOT=[]
def paras(d, upper=True, loose=False):
    out={}; cand={}
    for pg, t in pages(d):
        if is_toc(t): continue
        L=t.split('\n')
        for k,l in enumerate(L):
            m=re.match(rf'^(\d{{1,2}}){D}(\d{{1,2}}){D}(\d{{1,3}})\.\s+(\S.*)$', l.strip())
            if not m and loose: m=re.match(rf'^(\d{{1,2}}){D}(\d{{1,2}}){D}(\d{{1,3}})\.?\s+([A-Z][A-Z].*)$', l.strip())
            if not m or toc_line(l): continue
            title=m.group(4).strip()
            if loose and re.search(r'[a-z]', title):
                if not re.match(r'^[A-Z]', title) or len(title)>90 or re.search(r'[.;:,]$', title): continue
            elif upper:
                lw=len(re.findall(r'[a-z]', title)); up=len(re.findall(r'[A-Z]', title))
                if lw and (lw*5>up or not re.match(r'^[A-Z]', title)): continue
                # wrap: next line also all caps and the heading looks cut
                for kk in (k+1, k+2):
                    if kk>=len(L): break
                    nx=L[kk].strip()
                    if nx and len(title)>=30 and not APPL.match(nx) and not re.match(r'^(TBL|FIG)\b', nx) and len(re.findall(r'[a-z]', nx))*5<=len(re.findall(r'[A-Z]', nx)) and not STOP.match(nx) and len(nx)<=60 and re.search(r'[A-Z]{3}', nx) and not re.match(rf'^\d', nx):
                        title=title+' '+nx; WR.append((d,sec_dbg(m),title))
                    else: break
            else:
                if not re.match(r'^[A-Z]', title) or re.search(r'\d+'+D+r'\d+\s*$', title) or len(title)>110: continue
                if re.search(r'[.;:,]$', title) and not title.endswith('.'): continue
            sec=f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
            foot=bool(re.search(rf'^{m.group(1)}{D}{m.group(2)}{D}\d+\s*$', t, re.M))
            cand.setdefault(sec, []).append((foot, pg, norm(title).rstrip(' .')))
    for sec, cs in cand.items():
        good=[c for c in cs if c[0]]
        c=(good or cs)[0]
        out[sec]=[c[2], c[1]]
        if not good: NOFOOT.append((d,sec,c[1]))
    return out
def aom(d):
    out={}
    for pg,t in pages(d):
        if is_toc(t): continue
        for l in t.split('\n'):
            m=re.match(r'^(\d{4})\.\s+([A-Z][A-Z0-9 ,/&()\'\u2019\-]+?)\.(\s|$)', l.strip())
            if m and m.group(1) not in out: out[m.group(1)]=[norm(m.group(2)).strip(), pg]
    return out
def facman_tblfig(d):
    PG=pages(d)
    full=''.join(t for _,t in PG)
    out={}
    i=full.find('LIST OF TABLES AND FIGURES'); j=full.find('Chapter 1.', i)
    lines=[x.strip() for x in full[i:j].split('\n')][1:]
    kind=None; pend=[]; pairs=[]
    for l in lines:
        if not l: continue
        if l in ('Table','Figure'): kind='TBL' if l=='Table' else 'FIG'; continue
        if re.match(r'^[A-Z0-9]{1,2}-\d+$', l) and kind: pend.append((kind,l)); continue
        if l in ('Page','Table of Contents','NFG FACMAN') or re.match(r'^(\d+-\d+-\d+|Appendix [A-Z]-\d+|[xivl]+|JULY \d{4})$', l): continue
        if pend: k,n=pend.pop(0); pairs.append((k,n,l))
    assert not pend, pend
    for kind,n,ti in pairs:
            pg=None
            for p,t in PG:
                if is_toc(t): continue
                if re.search(rf'^{kind} {re.escape(n)}\s*$', t, re.M) or re.search(rf'^{kind} {re.escape(n)} [A-Z]', t, re.M):
                    if p>12: pg=p; break
            if pg: out[f'{kind} {n}']=[ti, pg]
    for p,t in pages(d):
        head='\n'.join(t.split('\n')[:10])
        for m in re.finditer(r'^Appendix ([A-D])\. ([A-Z][A-Z &]+)$', head, re.M):
            key=f'APP {m.group(1)}'
            if key not in out and p>12: out[key]=[m.group(2).strip(), p]
    return out
def jo_tbl(d):
    out={}
    for pg,t in pages(d):
        L=[x.strip() for x in t.split('\n')]
        for k,l in enumerate(L):
            m=re.match(rf'^TBL (\d+{D}\d+{D}\d+)$', l)
            if not m: continue
            nx=next((x for x in L[k+1:k+4] if x), '')
            key='TBL '+norm(m.group(1))
            if key in out or not re.search(r'[A-Za-z]{3}', nx) or len(nx)>90: continue
            out[key]=[norm(nx), pg]
    return out
def appendix(d):
    out={}
    for pg,t in pages(d):
        if is_toc(t): continue
        for m in re.finditer(r'^Appendix ([A-Z])\. (\S.{3,90})$', t, re.M):
            key=f'APP {m.group(1)}'
            if key not in out: out[key]=[norm(m.group(2)).strip(), pg]
    return out

def subpages(d, idx):
    """for each indexed paragraph, the PDF page of subparagraphs (a., b., ...) that start on a later page than the heading"""
    heads={}
    for sec,(title,pg) in idx.items():
        if re.match(r'^\d+-\d+-\d+$', sec): heads.setdefault(pg, []).append(sec)
    cur=None; last=''; out={}
    for pg,t in pages(d):
        if is_toc(t): continue
        for l in t.split('\n'):
            l=l.strip()
            m=re.match(rf'^(\d{{1,2}}){D}(\d{{1,2}}){D}(\d{{1,3}})\.?\s', l)
            if m:
                sec=f'{m.group(1)}-{m.group(2)}-{m.group(3)}'
                if sec in heads.get(pg, []): cur=(sec,pg); last=''; continue
            if not cur: continue
            m=re.match(r'^([a-z])\.\s+\S', l)
            if m:
                c=m.group(1); exp=chr(ord(last)+1) if last else 'a'
                if c==exp:
                    last=c
                    if pg!=cur[1]: out.setdefault(cur[0], {})[c]=pg
    for sec,sp in out.items():
        if sec in idx: idx[sec]=idx[sec]+[sp]
IDX={}
WR=[]
def sec_dbg(m): return m.group(1)+'-'+m.group(2)+'-'+m.group(3)
IDX['facman']={**paras('NFG-FACMAN-July-2026', loose=True), **facman_tblfig('NFG-FACMAN-July-2026')}
IDX['jochg2']={**paras('JO-7110.65BB-CHG2-2026-01-22'), **jo_tbl('JO-7110.65BB-CHG2-2026-01-22')}
IDX['jo']={**paras('JO-7110.65BB'), **jo_tbl('JO-7110.65BB')}
# JO appendices: full titles from the JO TOC (p.23), pages = appendix title pages (top-of-page heading)
for ap,pg in (('A',557),('B',561)):
    t23=open(f'{B}/JO-7110.65BB/23.txt').read().replace('\n',' ')
    mm=re.search(rf'Appendix {ap}\. (.+?)\s*(?:(?:\. ){{3,}}|Appendix [A-Z]\.)', t23)
    assert mm and re.match(rf'^Appendix {ap}\.', open(f'{B}/JO-7110.65BB/{pg}.txt').read().split('\n')[4])
    IDX['jo'][f'APP {ap}']=[norm(mm.group(1)).strip(), pg]
IDX['jochg2']={k:v for k,v in IDX['jochg2'].items() if v[1]>=18}
IDX['aim']=paras('AIM-2025-02-20', upper=False)
IDX['aom']=aom('StaO-3710.1H-Airfield-Operations-Manual')
IDX['facman2025']={**paras('NFG-FACMAN-July-2025', loose=True), **facman_tblfig('NFG-FACMAN-July-2025')}
for k in IDX: IDX[k]={a:b for a,b in IDX[k].items() if b[0].strip()}
for k,d in (('facman','NFG-FACMAN-July-2026'),('facman2025','NFG-FACMAN-July-2025'),('jo','JO-7110.65BB'),('jochg2','JO-7110.65BB-CHG2-2026-01-22'),('aim','AIM-2025-02-20')): subpages(d, IDX[k])
for k,v in IDX.items(): print(k, len(v))
json.dump(IDX, open('/workspace/build-brief/patch9/secidx.json','w'), ensure_ascii=False, indent=0)

import collections
print('NOFOOT', collections.Counter(x[0] for x in NOFOOT)); [print('NF',x) for x in NOFOOT[:40]]

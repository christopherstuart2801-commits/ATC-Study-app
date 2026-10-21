# Builds site/data/para-index.json: paragraphs (pub, para, heading, page, text) from public PDFs via pdftotext.
import subprocess,re,json,sys,os
D=os.path.join(os.path.dirname(__file__),'..','site','docs')
PUBS=[('facman','NFG-FACMAN-July-2026.pdf'),('jo','JO-7110.65BB.pdf')]
H=re.compile(r'^\s*(\d{1,2})[\-\u2010-\u2015\u2212](\d{1,2})[\-\u2010-\u2015\u2212](\d{1,3})\.\s+([A-Z][A-Z0-9 ,/()&\-\u2010-\u2015\u2212\'’]{2,})\s*$')
out=[]
for pid,f in PUBS:
    n=int(re.search(r'Pages:\s+(\d+)',subprocess.run(['pdfinfo',os.path.join(D,f)],capture_output=True,text=True).stdout).group(1))
    cur=None; seen=set()
    for pg in range(1,n+1):
        t=subprocess.run(['pdftotext','-f',str(pg),'-l',str(pg),os.path.join(D,f),'-'],capture_output=True,text=True).stdout
        for line in t.split('\n'):
            m=H.match(line)
            if m:
                k='%s-%s-%s'%m.groups()[:3]
                if k in seen: cur=None; continue  # TOC repeats: keep first body occurrence? (TOC lines usually have dots/page, so skip)
                seen.add(k)
                cur={'p':pid,'k':k,'h':m.group(4).strip().replace('\u2212','-'),'pg':pg,'t':''}; out.append(cur); continue
            if cur and len(cur['t'])<2500:
                s=line.strip()
                if s and not re.match(r'^(JO 7110\.65BB|\d+/\d+/\d+|\d+[\-\u2212]\d+[\-\u2212]\d+|Page \d+)$',s): cur['t']+=s+' '
for e in out: e['t']=re.sub(r'\s+',' ',e['t']).replace('\u2212','-').strip()
json.dump(out,open(os.path.join(D,'..','data','para-index.json'),'w'),separators=(',',':'),ensure_ascii=False)
print(len(out), {p:sum(1 for e in out if e['p']==p) for p,_ in PUBS})

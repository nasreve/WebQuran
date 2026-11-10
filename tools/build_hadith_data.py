"""Build an offline, source-separated hadith reading corpus from user CHMs.

Numbers are copied from content, never invented from filenames. Conservative
brochure extraction accepts bilingual passages ending in an explicit HR citation.
Original reading context remains available in generated, script-free source pages.
"""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/hadith'
DISABLED_SEARCH_SOURCES = {'kitab-kumpulan-hadits-digital'}
EXTRACTOR = Path(r'C:\Program Files\NVIDIA Corporation\NVIDIA GeForce Experience\7z.exe')
AR = re.compile(r'[\u0600-\u06ff]')
NUMBER = re.compile(r'^(?:No\.?\s*Hadi(?:ts|st|s)\s*[:.]?|Hadi(?:ts|st|s)\s*No\.?)\s*(\d+[a-z]?)', re.I)
INLINE_NUMBER = re.compile(r'^(\d+(?:\s*[-–]\s*\d+)?)[.\-–]\s*(?=[A-Za-z])')
HR = re.compile(r'[\[(]\s*H\.?\s*(?:S\.?\s*)?R\.?\s*[^\]\)]+[\]\)]', re.I)
GRADE = re.compile(r'^(?:Shahih|Hasan|Dhaif|Dla.?if|Takhrij)\s*:', re.I)

LABELS = {
 'kitab-shahih-bukhari': 'Shahih Bukhari',
 'kitab-shahih-muslim': 'Mukhtashar Shahih Muslim',
 'kitab-shahih-sunan-abu-daud': 'Shahih Sunan Abu Daud',
 'kitab-shahih-sunan-ibnu-majah': 'Shahih Sunan Ibnu Majah',
 'kitab-shahih-sunan-tirmidzi': 'Shahih Sunan Tirmidzi',
 'kitab-sunan-ad-darimi': 'Sunan Ad-Darimi',
 'kitab-sunan-nasai': "Sunan Nasa’i",
 'kitab-9-imam': 'Kitab 9 Imam',
 'kitab-himpunan-hadits-qudsi': 'Himpunan Hadits Qudsi',
 'kitab-kumpulan-hadits-digital': 'Kumpulan Hadits Digital',
 'brosur-ahad-pagi-1995-2024': 'Brosur Ahad Pagi',
}

def clean(s):
    return re.sub(r'[\s\u200b\ufeff]+', ' ', s).strip()

class Blocks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.buf = []
        self.skip = 0
        self.images = []

    def flush(self):
        text = clean(''.join(self.buf))
        if text or self.images:
            self.blocks.append({'text': text, 'images': self.images})
        self.buf, self.images = [], []

    def handle_starttag(self, tag, attrs):
        if tag in ('head', 'style', 'script', 'xml'):
            self.skip += 1
        if not self.skip and tag in ('p', 'div', 'tr', 'br', 'h1', 'h2', 'h3', 'li'):
            self.flush()
        if not self.skip and tag == 'img':
            src = dict(attrs).get('src', '')
            if src:
                self.images.append(src)

    def handle_endtag(self, tag):
        if tag in ('head', 'style', 'script', 'xml'):
            self.skip = max(0, self.skip - 1)
        if not self.skip and tag in ('p', 'div', 'tr', 'h1', 'h2', 'h3', 'li'):
            self.flush()

    def handle_data(self, value):
        if not self.skip:
            self.buf.append(value)

def decode(raw):
    if raw.startswith(b'\xef\xbb\xbf'):
        return raw.decode('utf-8-sig')
    charset = re.search(br'charset\s*=\s*["\']?([\w-]+)', raw[:16000], re.I)
    encoding = charset[1].decode('ascii') if charset else 'windows-1252'
    try:
        return raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        return raw.decode('utf-8' if b'\xd8' in raw else 'windows-1252', errors='replace')

def is_arabic(text):
    return len(AR.findall(text)) >= 8 and len(AR.findall(text)) > len(re.findall('[a-zA-Z]', text))

def is_footer(text):
    return bool(re.match(r'^(?:Copyright|©|Kembali|Selanjutnya|Sebelumnya|Kompilasi|Compiled|HaditsWeb|www\.|http:)', text, re.I))

def make_entry(source, path, title, ordinal, arabic, translation, number='', reference='', notes='', images=None, collection=''):
    translation = translation.strip()
    if len(translation) < 30 or (not arabic and not images):
        return None
    sid = source['source_id']
    digest = hashlib.sha256(f'{sid}:{path}:{ordinal}'.encode()).hexdigest()[:18]
    return {
        'id': f'{sid}:{digest}', 'source_group': source['source_group'], 'source_id': sid,
        'source_path': path, 'title': clean(title), 'collection': collection or LABELS[sid],
        'number': clean(number), 'arabic': arabic.strip(), 'translation': translation,
        'reference': clean(reference), 'notes': notes.strip(), 'arabic_images': images or [],
    }

def numbered_entries(blocks, source, relative, title):
    entries = []
    current = None
    chapter = title
    collection = LABELS[source['source_id']]
    if source['source_id'] == 'kitab-9-imam':
        for block in blocks[:6]:
            pieces = block['text'].split('>')
            if len(pieces) >= 3:
                collection = clean(pieces[1]).title()
                chapter = clean(pieces[-1] or pieces[-2])
                break
    def finish():
        if current:
            item = make_entry(source, relative, current['chapter'], len(entries), '\n\n'.join(current['ar']), '\n\n'.join(current['tr']), current['number'], collection + ' • No. ' + current['number'], collection=collection)
            if item:
                entries.append(item)
    for b in blocks:
        text = b['text']
        match = NUMBER.match(text)
        if match:
            finish()
            current = {'number': match[1], 'ar': [], 'tr': [], 'chapter': chapter}
            text = text[match.end():].strip()
        if re.match(r'^Bab\s*:', text, re.I):
            chapter = re.sub(r'^Bab\s*:\s*', '', text, flags=re.I)
            if current:
                current['chapter'] = chapter
            continue
        if current and text and not is_footer(text):
            current['ar' if is_arabic(text) else 'tr'].append(text)
    finish()
    return entries

def paired_entries(blocks, source, relative, title, brochure=False):
    entries = []
    ar, tr, notes = [], [], []
    number = ''
    def finish():
        nonlocal ar, tr, notes, number
        translated = '\n\n'.join(tr)
        refs = HR.findall(translated)
        # Brochure text must explicitly identify a hadith reference. Quran-only
        # passages and surrounding thematic commentary are not indexed.
        quran_citation = bool(tr and re.search(r'\bQ\.?\s*S\.?\s*[:.(]|\bSurat\s+\d', tr[0], re.I))
        contiguous_quote = len(translated) <= len(' '.join(ar)) * 8 + 300 and not any(re.match(r'^(?:Hadits (?:tersebut|ini)|Dan diriwayatkan|Keterangan|Penjelasan)\b', t, re.I) for t in tr)
        if ar and tr and (not brochure or (refs and not quran_citation and contiguous_quote)):
            if brochure:
                stop = list(HR.finditer(translated))[-1].end()
                translated = translated[:stop]
            reference = ' / '.join(refs) if refs else ''
            if not brochure and not reference and number:
                reference = LABELS[source['source_id']] + ' • No. ' + number
            item = make_entry(source, relative, title, len(entries), '\n\n'.join(ar), translated, number, reference, '\n\n'.join(notes))
            if item:
                entries.append(item)
        ar, tr, notes, number = [], [], [], ''
    for block in blocks:
        text = block['text']
        if not text or is_footer(text):
            continue
        if is_arabic(text):
            if tr:
                finish()
            ar.append(text)
        elif ar:
            if brochure and re.match(r'^(?:Keterangan|Penjelasan|Catatan)\s*:', text, re.I):
                finish()
                continue
            match = INLINE_NUMBER.match(text)
            if match and not tr and not brochure:
                number = clean(match[1])
                text = text[match.end():].strip()
            if GRADE.match(text):
                notes.append(text)
            else:
                tr.append(text)
            if brochure and HR.search('\n'.join(tr)):
                finish()
    finish()
    return entries

def qudsi_entries(blocks, source, relative, title, source_root):
    entries, images, text = [], [], []
    def finish():
        nonlocal images, text
        tr = '\n\n'.join(text)
        refs = re.findall(r'\((?:Hadits|HR|H\.R)[^)]*\)', tr, re.I)
        item = make_entry(source, relative, title, len(entries), '', tr, reference=' / '.join(refs), images=images)
        if item:
            entries.append(item)
        images, text = [], []
    for block in blocks:
        for src in block['images']:
            if not re.search(r'qudsi_\d+', src, re.I):
                continue
            if text:
                finish()
            candidate = (source_root / Path(relative).parent / src).resolve()
            if candidate.is_relative_to(source_root.resolve()) and candidate.is_file():
                target = OUT / 'assets' / source['source_id'] / candidate.name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(candidate, target)
                images.append(target.relative_to(ROOT).as_posix())
        if images and block['text'] and not re.match(r'^(?:Artinya\s*:|Kembali|Copyright)', block['text'], re.I):
            text.append(block['text'])
    finish()
    return entries

def source_page(blocks, source, relative, title):
    digest = hashlib.sha256(relative.encode()).hexdigest()[:18]
    target = OUT / 'reading' / source['source_id'] / (digest + '.html')
    target.parent.mkdir(parents=True, exist_ok=True)
    content = ''
    for block in blocks:
        if block['text']:
            content += '<p dir="auto">' + html.escape(block['text']) + '</p>'
        for src in block['images']:
            asset = OUT / 'assets' / source['source_id'] / Path(src).name
            if source['source_id'] == 'kitab-himpunan-hadits-qudsi' and asset.is_file():
                content += '<img style="max-width:100%;height:auto" alt="Teks Arab dari sumber" src="../../assets/' + source['source_id'] + '/' + html.escape(asset.name, quote=True) + '">'
    target.write_text('<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + html.escape(title) + '</title><style>body{font:17px/1.9 system-ui;background:#f8fafc;color:#243044;max-width:900px;padding:36px 24px;margin:auto}h1{font-size:26px;line-height:1.4}p[dir=auto]{white-space:pre-wrap}small{color:#64748b}a{color:#2563eb}</style><h1>' + html.escape(title) + '</h1><small>' + html.escape(LABELS[source['source_id']] + ' · ' + relative) + '</small><hr>' + content + '</html>', encoding='utf-8')
    return target.relative_to(ROOT).as_posix()

def build():
    OUT.mkdir(exist_ok=True, parents=True)
    sources = json.loads((ROOT / 'hadits/sources.json').read_text(encoding='utf-8'))['sources']
    catalog = {'schema_version': 1, 'sources': [], 'groups': [{'id':'kitab','label':'Kitab Hadits'}, {'id':'brosur','label':'Brosur Ahad Pagi'}]}
    only = sys.argv[1:]
    if only and (OUT/'catalog.json').exists():
        catalog = json.loads((OUT/'catalog.json').read_text(encoding='utf-8'))
    catalog['sources'] = [s for s in catalog['sources'] if s['id'] not in DISABLED_SEARCH_SOURCES]
    for source in sources:
        sid = source['source_id']
        if sid in DISABLED_SEARCH_SOURCES:
            continue
        if only and sid not in only:
            continue
        is_brochure = source['source_group'] == 'brosur'
        if is_brochure:
            folder = ROOT / 'tools/hadits-audit/extracted'
        else:
            folder = ROOT / 'tools/hadits-kitab-audit' / sid / 'extracted'
            if not (folder / '.extraction-complete').exists():
                folder.mkdir(exist_ok=True, parents=True)
                cp = subprocess.run([str(EXTRACTOR), 'x', str(ROOT/source['source_file']), '-o'+str(folder), '-y', '-r', '*.htm', '*.html', '*.gif', '*.jpg'], capture_output=True)
                if cp.returncode:
                    errors = cp.stderr.decode('utf-8', errors='replace')
                    broken = re.findall(r'ERROR: Data Error : (.+)', errors)
                    if not broken:
                        raise RuntimeError(f'Extraction failed: {sid}: {errors[-1000:]}')
                    (folder / '.excluded-pages.json').write_text(json.dumps(broken), encoding='utf-8')
                (folder/'.extraction-complete').write_text(source['sha256'])
        excluded = [p.strip() for p in json.loads((folder/'.excluded-pages.json').read_text(encoding='utf-8'))] if (folder/'.excluded-pages.json').exists() else []
        entries, processed, skipped = [], 0, 0
        for file in sorted(folder.rglob('*')):
            if not file.is_file() or file.suffix.lower() not in ('.htm', '.html'):
                continue
            relative = file.relative_to(folder).as_posix()
            if relative in excluded:
                skipped += 1
                continue
            if '.files/' in relative.lower() or relative.lower().startswith(('quran/', 'template/', 'template2/', 'other_file/')):
                continue
            if is_brochure and not re.match(r'^\d{4}/\d{6,8}[^/]*\.html?$', relative):
                continue
            source_text = decode(file.read_bytes())
            parser = Blocks()
            parser.feed(source_text)
            parser.flush()
            blocks = parser.blocks
            match = re.search(r'<title[^>]*>([\s\S]*?)</title>', source_text, re.I)
            title = clean(html.unescape(re.sub('<[^>]+>', '', match[1]))) if match else file.stem
            if sid == 'kitab-himpunan-hadits-qudsi':
                if not file.stem.startswith('hadits_qudsi_'):
                    continue
                for b in blocks[:12]:
                    if b['text'] and len(b['text']) > 10:
                        title = b['text'].title()
                        break
                found = qudsi_entries(blocks, source, relative, title, folder)
            elif any(NUMBER.match(b['text']) for b in blocks):
                found = numbered_entries(blocks, source, relative, title)
            elif sid in ('kitab-9-imam', 'kitab-shahih-bukhari', 'kitab-sunan-ad-darimi', 'kitab-sunan-nasai'):
                found = []  # Chapter indexes are not hadiths.
            elif sid == 'kitab-kumpulan-hadits-digital':
                # This anthology includes Quran and commentary even outside quran/.
                # Accept only a directly adjacent bilingual passage with explicit HR.
                found = paired_entries(blocks, source, relative, title, True)
                found = [e for e in found if not re.search(r'\bQ\.?\s*S\.?\s*[:.(]|\bSurat\s+\d', e['translation'], re.I)]
            else:
                found = paired_entries(blocks, source, relative, title, is_brochure)
                if not is_brochure:
                    found = [e for e in found if e['number']]
            if found:
                reading = source_page(blocks, source, relative, title)
                for entry in found:
                    entry['reading_url'] = reading
                entries.extend(found)
                processed += 1
            else:
                skipped += 1
        file = OUT / (sid+'.json')
        file.write_text(json.dumps(entries, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        catalog['sources'] = [s for s in catalog['sources'] if s['id'] != sid]
        catalog['sources'].append({
            'id': sid, 'group': source['source_group'], 'label': LABELS[sid],
            'source_file': source['source_file'], 'file': file.relative_to(ROOT).as_posix(),
            'count': len(entries), 'pages': processed, 'skipped_pages': skipped,
            'numbered': sum(bool(e['number']) for e in entries),
            'image_arabic': sum(bool(e['arabic_images']) for e in entries),
            'bytes': file.stat().st_size,
            'excluded_pages': excluded,
        })
        print(f'{sid}: {len(entries)} entries / {processed} pages / {file.stat().st_size/1e6:.1f} MB', flush=True)
    (OUT/'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Build finished', flush=True)

if __name__ == '__main__':
    build()

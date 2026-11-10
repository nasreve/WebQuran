"""Read extracted CHM pages. Inventory only: never infer a hadith's grade."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter, defaultdict
from datetime import datetime
from urllib.parse import unquote
import hashlib
import html
import json
import re

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'extracted'
SOURCE_GROUP = 'brosur'
SOURCE_ID = 'brosur-ahad-pagi-1995-2024'

class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skipped = 0
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag in ('head', 'script', 'style'):
            self.skipped += 1
        if not self.skipped and tag in ('p', 'div', 'br', 'hr', 'tr', 'li', 'h1', 'h2', 'h3'):
            self.parts.append('\n')
        if tag == 'img':
            self.images.append(dict(attrs).get('src', ''))

    def handle_endtag(self, tag):
        if tag in ('head', 'script', 'style'):
            self.skipped = max(0, self.skipped - 1)
        if not self.skipped and tag in ('p', 'div', 'tr', 'li', 'h1', 'h2', 'h3'):
            self.parts.append('\n')

    def handle_data(self, data):
        if not self.skipped:
            self.parts.append(data)

    def text(self):
        lines = [re.sub(r'[\s\u200b\ufeff]+', ' ', line).strip() for line in ''.join(self.parts).split('\n')]
        return '\n'.join(line for line in lines if line)

class Contents(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.current = {}
        self.entries = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'object':
            self.current = {}
        elif tag == 'param':
            self.current[attrs.get('name', '').lower()] = attrs.get('value', '')

    def handle_endtag(self, tag):
        if tag == 'object' and 'local' in self.current:
            self.entries[unquote(self.current['local'].replace('\\', '/').split('#')[0])] = self.current.get('name', '')

contents = Contents()
for toc in SOURCE.glob('*.hhc'):
    contents.feed(toc.read_bytes().decode('windows-1252', errors='replace'))

PATTERNS = {
    'quran_reference_marker': re.compile(r'\bQ\.?\s*S\.?\s', re.I),
    'hadith_reference_marker': re.compile(r'\bH\.?\s*R\.?\s', re.I),
    'shahih_word': re.compile(r'\b(?:shahih|shohih|sahih|sah\u012bh)\b', re.I),
    'hasan_word': re.compile(r'\bhasan\b', re.I),
    'dhaif_word': re.compile(r"\b(?:dha|dho|dla|dlo|da)[’'‘`]?if\b", re.I),
    'maudhu_word': re.compile(r"\bmau(?:dh|dl|d)u[’'‘`]?\b", re.I),
    'palsu_word': re.compile(r'\bpalsu\b', re.I),
}

records = []
extensions = Counter()
encodings = Counter()
years = Counter()
duplicates = defaultdict(list)
all_bytes = 0
for file in sorted(SOURCE.rglob('*')):
    if not file.is_file():
        continue
    extensions[file.suffix.lower()] += 1
    all_bytes += file.stat().st_size
    if file.suffix.lower() not in ('.htm', '.html'):
        continue
    raw = file.read_bytes()
    charset = re.search(br'charset\s*=\s*["\']?([\w-]+)', raw[:12000], re.I)
    encoding = charset[1].decode('ascii') if charset else 'windows-1252'
    if raw.startswith(b'\xef\xbb\xbf'):
        encoding = 'utf-8-sig'
    try:
        source = raw.decode(encoding)
    except (LookupError, UnicodeDecodeError):
        encoding = 'utf-8' if raw.decode('utf-8', errors='replace').count('\ufffd') == 0 else 'windows-1252'
        source = raw.decode(encoding, errors='replace')
    encodings[encoding.lower()] += 1
    parser = PageText()
    parser.feed(source)
    text = parser.text()
    relative = file.relative_to(SOURCE).as_posix()
    date_match = re.match(r'^(\d{4})/(\d{8}|\d{6})[^/]*\.(?:htm|html)$', relative, re.I)
    date = None
    if date_match:
        try:
            date_digits = date_match[2]
            if len(date_digits) == 6:
                date_digits = date_match[1][:2] + date_digits
            date = datetime.strptime(date_digits, '%Y%m%d').date().isoformat()
        except ValueError:
            pass
    if date:
        years[date[:4]] += 1
    title = re.search(r'<title[^>]*>([\s\S]*?)</title>', source, re.I)
    title = html.unescape(re.sub('<[^>]+>', '', title[1])).strip() if title else file.stem
    text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
    if date:
        duplicates[text_hash].append(relative)
    counts = {name: len(pattern.findall(text)) for name, pattern in PATTERNS.items()}
    record = {
        'source_group': SOURCE_GROUP, 'source_id': SOURCE_ID,
        'document_id': f'{SOURCE_ID}:{relative}',
        'source_path': relative, 'title': contents.entries.get(relative) or title,
        'html_title': title, 'date_from_filename': date,
        'encoding': encoding, 'html_bytes': len(raw), 'text_characters': len(text),
        'arabic_characters': len(re.findall(r'[\u0600-\u06ff]', text)),
        'replacement_characters': text.count('\ufffd'), 'images': parser.images,
        'marker_counts': counts, 'text_sha256': text_hash,
        'text': text,
    }
    records.append(record)

brochures = [r for r in records if r['date_from_filename']]
summary = {
    'source_group': SOURCE_GROUP, 'source_id': SOURCE_ID,
    'input_filename': 'Brosur Ahad Pagi 1995 - 2024.chm',
    'input_bytes': (ROOT / '../../hadits/Brosur Ahad Pagi 1995 - 2024.chm').resolve().stat().st_size,
    'extracted_bytes': all_bytes, 'files_by_extension': dict(extensions),
    'html_pages': len(records), 'dated_brochure_pages': len(brochures),
    'toc_unique_targets': len(contents.entries),
    'toc_missing_targets': [p for p in contents.entries if not (SOURCE / p).is_file()],
    'other_html_pages': len(records) - len(brochures),
    'earliest_date': min(r['date_from_filename'] for r in brochures),
    'latest_date': max(r['date_from_filename'] for r in brochures),
    'brochures_by_year': dict(sorted(years.items())), 'declared_or_detected_encodings': dict(encodings),
    'brochures_with_arabic_text': sum(r['arabic_characters'] > 20 for r in brochures),
    'brochures_with_under_200_text_characters': [r['source_path'] for r in brochures if r['text_characters'] < 200],
    'brochure_text_utf8_bytes': sum(len(r['text'].encode('utf-8')) for r in brochures),
    'html_pages_with_replacement_characters': sum(r['replacement_characters'] > 0 for r in records),
    'brochure_pages_containing_marker': {name: sum(r['marker_counts'][name] > 0 for r in brochures) for name in PATTERNS},
    'exact_duplicate_brochure_text_groups': [paths for paths in duplicates.values() if len(paths) > 1],
    'limitations': [
        'Dated brochure identification uses the filename; dates and topics still require source checks.',
        'Markers count pages mentioning words, not hadith counts or authenticated grades.',
        'No automatic link between a grading mention and an individual hadith is asserted.',
        'Paragraph formatting and original source files are retained separately; extracted text needs QA.',
    ],
}
(ROOT / 'inventory.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
with (ROOT / 'pages.jsonl').open('w', encoding='utf-8') as output:
    for record in records:
        output.write(json.dumps(record, ensure_ascii=False) + '\n')
print(json.dumps(summary, ensure_ascii=False, indent=2))

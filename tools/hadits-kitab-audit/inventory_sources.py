"""Register original hadith sources without merging their contents."""
from pathlib import Path
import hashlib
import json

PROJECT = Path(__file__).resolve().parents[2]
HADITS = PROJECT / 'hadits'

SOURCES = [
    ('brosur', 'brosur-ahad-pagi-1995-2024', 'Brosur Ahad Pagi 1995 - 2024.chm'),
    ('kitab', 'kitab-himpunan-hadits-qudsi', 'Kitab Hadits/Himpunan Hadits Qudsi.chm'),
    ('kitab', 'kitab-9-imam', 'Kitab Hadits/Kitab-9-Imam.chm'),
    ('kitab', 'kitab-kumpulan-hadits-digital', 'Kitab Hadits/KumpulanHadits-Digital.chm'),
    ('kitab', 'kitab-shahih-bukhari', 'Kitab Hadits/shahih Bukhari.chm'),
    ('kitab', 'kitab-shahih-muslim', 'Kitab Hadits/shahih Muslim.chm'),
    ('kitab', 'kitab-shahih-sunan-abu-daud', 'Kitab Hadits/shahih sunan abu daud.chm'),
    ('kitab', 'kitab-shahih-sunan-ibnu-majah', 'Kitab Hadits/shahih sunan ibnu majah.chm'),
    ('kitab', 'kitab-shahih-sunan-tirmidzi', 'Kitab Hadits/shahih sunan tirmidzi.chm'),
    ('kitab', 'kitab-sunan-ad-darimi', 'Kitab Hadits/sunan ad-darimi.chm'),
    ('kitab', 'kitab-sunan-nasai', "Kitab Hadits/Sunan Nasa'i.chm"),
]

def checksum(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

manifest = {
    'schema_version': 1,
    'purpose': 'Source inventory for future hadith-only search; not a normalized hadith database.',
    'groups': [
        {'id': 'brosur', 'label': 'Brosur Ahad Pagi'},
        {'id': 'kitab', 'label': 'Kitab Hadits'},
    ],
    'policy': {
        'required_source_fields': ['source_group', 'source_id', 'source_path'],
        'search_one_group_at_a_time': True,
        'index_hadith_content_only': True,
        'merge_records_across_sources': False,
        'infer_grade_from_filename': False,
        'required_result_fields_when_available': ['arabic', 'translation_id', 'collection', 'hadith_number'],
        'missing_hadith_number': 'Preserve the original reference; never substitute page, brochure, or file sequence numbers.',
        'grading': 'Optional; preserve its original wording and provenance when present.',
        'record_identity': 'Include source_id and document/entry identity; a hadith number alone is not a unique ID.',
    },
    'sources': [],
    'excluded_from_hadith_search': [],
}

for group, source_id, relative in SOURCES:
    file = HADITS / relative
    if not file.is_file():
        raise FileNotFoundError(file)
    manifest['sources'].append({
        'source_group': group, 'source_id': source_id,
        'title_from_filename': file.stem,
        'source_file': file.relative_to(PROJECT).as_posix(),
        'format': 'chm', 'bytes': file.stat().st_size, 'sha256': checksum(file),
        'status': 'pages_extracted_not_hadith_normalized' if group == 'brosur' else 'registered_not_hadith_normalized',
        'derived_output_directory': 'tools/hadits-audit' if group == 'brosur' else f'tools/hadits-kitab-audit/{source_id}',
        'edition': None,
        'excluded_internal_path_prefixes': ['quran/'] if source_id == 'kitab-kumpulan-hadits-digital' else [],
    })

registered = {str((PROJECT / item['source_file']).resolve()).lower() for item in manifest['sources']}
actual = {str(file.resolve()).lower() for file in HADITS.rglob('*') if file.is_file() and file.suffix.lower() == '.chm'}
manifest['unregistered_chm_files'] = sorted(actual - registered)
archive_inventory = Path(__file__).resolve().parent / 'archive-inventory.json'
if archive_inventory.is_file():
    archives = json.loads(archive_inventory.read_text(encoding='utf-8-sig'))
    by_filename = {Path(s['source_file']).name: s for s in manifest['sources'] if s['source_group'] == 'kitab'}
    for archive in archives:
        source = by_filename[archive['filename']]
        archive['source_group'] = source['source_group']
        archive['source_id'] = source['source_id']
        archive['source_file'] = source['source_file']
        if 'file_count' in archive:
            archive['archive_entry_count'] = archive.pop('file_count')
        source['status'] = 'archive_listed_not_hadith_normalized'
        source['archive_html_pages'] = archive['html_pages']
    archive_inventory.write_text(json.dumps(archives, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
output = HADITS / 'sources.json'
output.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({
    'sources': len(manifest['sources']),
    'brochure_sources': sum(s['source_group'] == 'brosur' for s in manifest['sources']),
    'kitab_sources': sum(s['source_group'] == 'kitab' for s in manifest['sources']),
    'kitab_bytes': sum(s['bytes'] for s in manifest['sources'] if s['source_group'] == 'kitab'),
    'excluded': len(manifest['excluded_from_hadith_search']),
    'unregistered_chm_files': manifest['unregistered_chm_files'],
}, ensure_ascii=False))

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../js/hadith-engine');

test('lower-third keeps short cues moderate and restores size after long cues and mode changes', () => {
  const script=fs.readFileSync(require.resolve('../js/hadith-presentation.js'),'utf8');
  const fitCode=script.slice(script.indexOf('  function fit() {'),script.indexOf('  function visualKey'));
  const text = () => ({style:{},length:20,get scrollHeight(){
    const size=parseFloat(this.style.fontSize); return Math.ceil(this.length * size * .55 / 1600) * size * 1.52;
  },scrollWidth:1600});
  const arabic=text(),translation=text();
  const ctx={innerWidth:1920,innerHeight:1080,document:{documentElement:{style:{setProperty(){}}}},
    card:{hidden:false,dataset:{}},content:{clientHeight:300,clientWidth:1760},arabic,translation,images:{scrollHeight:200,scrollWidth:100},
    // fit() memanggil pengatur gulir otomatis (H4); di uji ini cukup no-op.
    stopAutoScroll(){},startAutoScroll(){},
    activeState:{displayMode:'arabic',template:'lower-third',arabic:'نص'},
    getComputedStyle:()=>({paddingTop:'20',paddingBottom:'12',paddingLeft:'80',paddingRight:'80'})};
  vm.runInNewContext(fitCode,ctx);
  assert.equal(ctx.fit(),true);
  assert.equal(arabic.style.fontSize,'48px');
  // Teks panjang mengecil sampai batas baca (26 px), bukan sampai 18 px.
  arabic.length=420;
  assert.equal(ctx.fit(),true);
  const reduced=parseFloat(arabic.style.fontSize);
  assert.ok(reduced<48 && reduced>=26, 'batas bawah 26 px: ' + reduced);
  arabic.style.fontSize=(reduced+1)+'px';
  assert.ok(arabic.scrollHeight>268);
  arabic.length=20;
  ctx.fit(); assert.equal(arabic.style.fontSize,'48px');
  ctx.activeState.displayMode='translation';
  ctx.fit(); assert.equal(translation.style.fontSize,'32px');
  ctx.innerWidth=1280;ctx.innerHeight=720;
  ctx.fit(); assert.equal(parseFloat(translation.style.fontSize),32 * 2 / 3);
  ctx.innerWidth=1920;ctx.innerHeight=1080;translation.length=100000;
  assert.equal(ctx.fit(),false);assert.equal(translation.style.fontSize,'18px');
  assert.equal(ctx.card.dataset.overflow,'true');
});

test('clipboard contains Arabic, translation and a single reference without archive metadata', () => {
  const item={arabic:'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',translation:'Amal tergantung niat.',
    reference:'Shahih Bukhari • No. 1',collection:'Shahih Bukhari',number:'1',
    source_path:'bab/1.html',reading_url:'data/hadith/reading/1.html',notes:'Catatan internal'};
  assert.equal(E.copyText(item),item.arabic+'\n\nAmal tergantung niat.\n\nShahih Bukhari • No. 1');
  assert.equal(E.copyText({...item,reference:''}),E.copyText(item));
  assert.equal(E.copyText({...item,reference:'HR. Bukhari'}),item.arabic+'\n\nAmal tergantung niat.\n\nHR. Bukhari • No. 1');
});

test('clipboard removes duplicated trailing citations and known archive footers only', () => {
  for (const separator of ['\n', '\n\n', '\r\n']) {
    for (const footer of ['Copyleft © 2007-2009 Kampungsunnah.org', 'Copyright (c) 2007–2009 Kampungsunnah.org']) {
      assert.equal(E.copyText({translation:'Isi hadits. {Muslim 1/40}'+separator+footer,reference:'Muslim • No. 3',number:'3'}),
        'Isi hadits. {Muslim 1/40}\n\nMuslim • No. 3');
    }
  }
  assert.equal(E.copyText({translation:'Sabda. (H.R. Baihaqi)',reference:'(H.R. Baihaqi)',collection:'Brosur Ahad Pagi'}),
    'Sabda.\n\n(H.R. Baihaqi)');
  assert.equal(E.copyText({translation:'Isi hadits.\n\nPenjelasan penting.\n\nProduksi Kampungsunnah.org tahun 2009. Realese 1.0, 12.06.2009, mailto: penerbit@example.com',reference:'Tirmidzi • No. 1',number:'1'}),
    'Isi hadits.\n\nPenjelasan penting.\n\nTirmidzi • No. 1');
  assert.equal(E.copyText({translation:'Isi (Hadits ditakhrij oleh Ibnu Majah).\n\n< kembali\n\ndaftar isi\n\nlanjut >',reference:'(Hadits ditakhrij oleh Ibnu Majah)'}),
    'Isi\n\n(Hadits ditakhrij oleh Ibnu Majah)');
  assert.equal(E.copyText({translation:'Isi tanpa nomor.',collection:'Himpunan Hadits Qudsi',arabic_images:['image.gif']}),
    'Isi tanpa nomor.\n\nHimpunan Hadits Qudsi');
});

test('Latin Arabic phrase retrieval derives signatures from original Arabic', () => {
  const arabic = 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ';
  for (const query of ["innamal a'malu binniyat", 'innamaa al amaalu bin niyyaati']) {
    const q = E.parse(query, 'latin');
    assert.ok(q.valid);
    assert.ok(E.scoreLatin({item:{arabic}}, q));
    assert.match(E.highlight(arabic, query, 'latin'), /<mark/);
    assert.match(E.snippet('قال الراوي '.repeat(40)+arabic+' خاتمة'.repeat(40),query,140,'latin'), /إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ/);
  }
  const row = {item:{arabic:'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ'}};
  assert.ok(E.scoreLatin(row,E.parse('man kana yuminu billah','latin')));
  assert.equal(E.scoreLatin(row,E.parse('innamal amalu binniyat','latin')),0);
  assert.equal(E.scoreLatin({item:{arabic:''}},E.parse('man kana yuminu','latin')),0);
  assert.equal(E.parse('aa','latin').valid,false);
  assert.equal(E.parse('12345','latin').valid,false);
  assert.equal(E.parse('إِنَّمَا','latin').valid,false);
  assert.equal(E.highlight('<img>', 'innamal amalu', 'latin'),'&lt;img&gt;');
  assert.equal(E.phonetic('syams dhikr',false).value,E.phonetic('shams dzikr',false).value);
});

test('worker Latin mode returns Arabic context and keeps text-mode cache separate', async () => {
  const messages=[];
  const item={id:'a1',source_id:'a',source_group:'kitab',number:'1',title:'Niat',collection:'A',
    arabic:'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',translation:'Amal bergantung niat',reference:'',arabic_images:[]};
  const ctx={self:{HadithSearchEngine:E,location:{href:'http://localhost/js/hadith-worker.js'}},
    importScripts(){},postMessage:m=>messages.push(m),URL,setTimeout,fetch:async()=>({ok:true,json:async()=>[item]})};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'),'utf8'),ctx);
  const data={type:'search',request:1,query:'innamal amalu binniyat',mode:'latin',group:'kitab',sources:[{id:'a',group:'kitab',file:'a.json',label:'A'}]};
  await ctx.self.onmessage({data});
  assert.equal(messages.at(-1).total,1);
  assert.equal(messages.at(-1).items[0].is_arabic_snippet,true);
  assert.equal(messages.at(-1).items[0].snippet,item.arabic);
  await ctx.self.onmessage({data:{...data,request:2,mode:'text'}});
  assert.equal(messages.at(-1).total,0);
});

test('all books reuse results and number index without preparing unrelated text', async () => {
  const sources = ['a', 'b'].map(id => ({id, group:'kitab', label:id, file:id+'.json'}));
  sources.push({id:'c',group:'brosur',label:'c',file:'c.json'});
  const messages = [], fetched = [];
  let prepared = 0, scored = 0;
  const engine = {...E, prepare(item) { prepared++; return E.prepare(item); }, score(row, q) { scored++; return E.score(row, q); }};
  const ctx = {self:{HadithSearchEngine:engine,location:{href:'http://localhost/js/hadith-worker.js'}},
    importScripts(){},postMessage:m=>messages.push(m),URL,setTimeout,
    fetch:async url => {
      const id = url.pathname.split('/').pop()[0]; fetched.push(id);
      return {ok:true,json:async()=>[1,2].map(number=>({id:id+number,source_id:id,source_group:'kitab',
        title:'Ilmu',collection:id.repeat(3),number:String(number),translation:'Menuntut ilmu',arabic:'علم',reference:'',arabic_images:[]}))};
    }};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'),'utf8'),ctx);
  let request = 0;
  const search = async (query, extra={}) => {
    await ctx.self.onmessage({data:{type:'search',request:++request,query,group:'kitab',sources,...extra}});
    return messages.at(-1);
  };
  assert.equal((await search('1')).total,2);
  assert.equal(prepared,0);
  assert.deepEqual(fetched,['a','b']);
  assert.equal((await search('ilmu')).total,4);
  assert.equal(prepared,4);
  const previousScored = scored;
  assert.equal((await search('ilmu',{sort:'number'})).total,4);
  assert.equal(scored,previousScored);
  assert.equal((await search('ilmu',{source:'b'})).total,2);
  assert.equal(scored,previousScored);
  assert.equal((await search('aaa 2')).items[0].id,'a2');
  assert.equal((await search('ilmu',{savedOnly:true,savedIds:['b1']})).total,1);
  assert.equal((await search('ilmu',{savedOnly:true,savedIds:['a1','b2']})).total,2);
  assert.equal(fetched.length,2);
});

test('cancelled text search does not finish preparing or publish stale results', async () => {
  const messages = [];
  let prepared = 0, cancel = false;
  const ctx = {self:{HadithSearchEngine:{...E,prepare(item){prepared++;return E.prepare(item);}},
    location:{href:'http://localhost/js/hadith-worker.js'}},importScripts(){},postMessage:m=>messages.push(m),URL,
    setTimeout(callback) {
      if (cancel) ctx.self.onmessage({data:{type:'cancel',request:3}});
      callback();
    },fetch:async()=>({ok:true,json:async()=>Array.from({length:600},(_,i)=>({id:'a'+i,source_id:'a',source_group:'kitab',
      number:String(i+1),title:'Ilmu',collection:'a',translation:'ilmu',arabic:'',reference:'',arabic_images:[]}))})};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'),'utf8'),ctx);
  const data={type:'search',request:1,query:'1',group:'kitab',sources:[{id:'a',group:'kitab',label:'a',file:'a.json'}]};
  await ctx.self.onmessage({data});
  cancel = true;
  await ctx.self.onmessage({data:{...data,request:2,query:'ilmu'}});
  assert.equal(prepared,250);
  assert.equal(messages.some(m=>m.type==='results' && m.request===2),false);
});

test('exact words and content rank above incidental substrings and metadata', () => {
  const q = E.parse('iman');
  const content = E.score(E.prepare({translation:'iman kepada Allah'}), q);
  const metadata = E.score(E.prepare({collection:'iman', translation:'teks lain'}), q);
  const incidental = E.score(E.prepare({translation:'bagaimana kabarmu'}), q);
  assert.ok(content > metadata);
  assert.ok(metadata > incidental);
  assert.ok(E.score(E.prepare({translation:'keimanan'}), q));
});

test('combined collection and number uses the source number, including Arabic digits', () => {
  const row = E.prepare({collection:'Bukhari', number:12, translation:'halaman 123'});
  assert.ok(E.score(row, E.parse('Bukhari 12')));
  assert.equal(E.score(row, E.parse('Bukhari 123')), 0);
  assert.ok(E.score(row, E.parse('١٢')));
  assert.ok(E.score(row, E.parse('۱۲')));
});

test('snippet favors a window containing all query terms and respects short word boundaries', () => {
  const text = 'iman seorang perawi. ' + 'Riwayat panjang. '.repeat(30) + 'iman dan amal saling berkaitan. ' + 'Penutup. '.repeat(30);
  const snippet = E.snippet(text, 'iman amal');
  assert.match(snippet, /iman dan amal/);
  const short = 'bagian awal. '.repeat(30) + 'Ali berkata benar. ' + 'penutup. '.repeat(30);
  assert.match(E.snippet(short, 'ali'), /Ali/);
});

test('Arabic without harakat and common Indonesian spellings match', () => {
  assert.equal(E.normalize('إِنَّمَا الأَعْمَالُ'), E.normalize('انما الاعمال'));
  const row = E.prepare({translation:'mendirikan shalat dan mencari rezeki'});
  assert.ok(E.score(row,E.parse('sholat')));
  assert.ok(E.score(row,E.parse('rejeki')));
  assert.equal(E.score(row,E.parse('shalat sedekah')),0);
});
test('numbers match source number exactly, never page or incidental prose', () => {
  const row=E.prepare({number:'148-177',translation:'dua ratus, halaman 42'});
  assert.ok(E.score(row,E.parse('148')));
  assert.ok(E.score(row,E.parse('177')));
  assert.equal(E.score(row,E.parse('14')),0);
  assert.equal(E.score(row,E.parse('42')),0);
});
test('highlight escapes source HTML and preserves Arabic diacritics', () => {
  assert.equal(E.highlight('<img src=x onerror=alert(1)>','img'), '&lt;<mark class="hd-highlight">img</mark> src=x onerror=alert(1)&gt;');
  assert.equal(E.highlight('إِنَّمَا','انما'),'<mark class="hd-highlight">إِنَّمَا</mark>');
  assert.equal(E.parse('aa').valid,false);
  assert.equal(E.parse('1').valid,true);
});
test('snippet centers on matched text beyond a long chain of narrators', () => {
  const text = 'Telah menceritakan kepada kami seorang perawi. '.repeat(20)+'Sedekah itu baik bagi manusia.';
  assert.match(E.snippet(text,'sedekah'),/Sedekah/);
  assert.ok(E.snippet(text,'sedekah').startsWith('…'));
});
test('worker separates groups, paginates, retrieves detail, and filters saved IDs', async () => {
  const messages=[], fetched=[];
  const sources=[{id:'a',group:'kitab',label:'A',file:'a.json'},{id:'b',group:'brosur',label:'B',file:'b.json'}];
  const rows=id=>Array.from({length:45},(_,i)=>({id:id+i,source_id:id,source_group:id==='a'?'kitab':'brosur',title:'Ilmu',collection:id,number:String(i+1),arabic:'علم',translation:'Menuntut ilmu',reference:'',arabic_images:[]}));
  const ctx={self:{HadithSearchEngine:E,location:{href:'http://localhost/js/hadith-worker.js'}},importScripts(){},postMessage:m=>messages.push(m),URL,setTimeout,fetch:async url=>{fetched.push(url.href);return {ok:true,json:async()=>rows(url.pathname.includes('a.json')?'a':'b')};}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'),'utf8'),ctx);
  await ctx.self.onmessage({data:{type:'search',request:1,query:'ilmu',group:'kitab',sources}});
  const result=messages.at(-1); assert.equal(result.total,45);assert.equal(result.items.length,40);assert.ok(result.items.every(x=>x.source_group==='kitab'));assert.equal(fetched.length,1);
  await ctx.self.onmessage({data:{type:'page',request:1,offset:40}});assert.equal(messages.at(-1).items.length,5);
  await ctx.self.onmessage({data:{type:'detail',request:1,source:'a',id:'a0'}});assert.equal(messages.at(-1).item.number,'1');
  await ctx.self.onmessage({data:{type:'search',request:2,query:'',group:'brosur',sources,savedOnly:true,savedIds:['a0','b1']}});
  assert.equal(messages.at(-1).total,1);assert.equal(messages.at(-1).items[0].id,'b1');
});
test('presentation cleaning preserves hadith fields and is safe to repeat across delivery layers', () => {
  const item = { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', translation: 'Isi hadits.\n\nDerajat: shahih.\n\nProduksi Kampungsunnah.org tahun 2009. Realese 1.0, mailto: penerbit@example.com\n\n< kembali\n\ndaftar isi\n\nlanjut >', reference: 'HR. Tirmidzi • No. 1', source_path: 'archive.html' };
  const cleaned = E.presentationText(item);
  assert.deepEqual(cleaned, { arabic: item.arabic, translation: 'Isi hadits.\n\nDerajat: shahih.', riwayat: item.reference });
  assert.deepEqual(E.presentationText(cleaned), cleaned);
  assert.equal(E.copyText(item), Object.values(cleaned).join('\n\n'));
});

test('real Bukhari first hadith has Arabic, translation, source and edition number', () => {
  const rows=JSON.parse(fs.readFileSync(require.resolve('../data/hadith/kitab-shahih-bukhari.json'),'utf8'));
  const hits=rows.filter(x=>E.score(E.prepare(x),E.parse('1')));
  assert.equal(hits.length,1);assert.match(hits[0].translation,/niat/);assert.match(hits[0].arabic,/إِنَّمَا/);assert.equal('source_group' in hits[0], false, 'identitas sumber tidak lagi disimpan per baris (diisi worker dari catalog)');
});

test('Arabic search supports short Arabic keywords, ta marbutha, and worker arabic snippet', async () => {
  // Test short Arabic query validity (>= 2 chars)
  assert.equal(E.parse('صم').valid, true);
  assert.equal(E.parse('نية').valid, true);
  assert.equal(E.parse('علم').valid, true);
  assert.equal(E.parse('ص').valid, false); // 1 char invalid

  // Test ta marbutha normalizes to ha
  assert.equal(E.normalize('نية'), E.normalize('نيه'));

  // Test scoring against Arabic hadith text
  const item = {
    id: 'k1',
    source_id: 'k',
    source_group: 'kitab',
    title: 'Hadits Niat',
    collection: 'Shahih Bukhari',
    number: '1',
    arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ',
    translation: 'Sesungguhnya amal perbuatan tergantung niat',
    reference: 'HR. Bukhari No. 1',
    arabic_images: []
  };
  const row = E.prepare(item);
  assert.ok(E.score(row, E.parse('بالنيات')));
  assert.ok(E.score(row, E.parse('نيات')));
  assert.ok(E.score(row, E.parse('الاعمال')));
  assert.ok(E.score(row, E.parse('انما')));

  // Test worker returns is_arabic_snippet = true for Arabic queries
  const messages = [];
  const sources = [{ id: 'k', group: 'kitab', label: 'Kitab', file: 'k.json' }];
  const ctx = {
    self: { HadithSearchEngine: E, location: { href: 'http://localhost/js/hadith-worker.js' } },
    importScripts() {},
    postMessage: m => messages.push(m),
    URL,
    setTimeout,
    fetch: async () => ({ ok: true, json: async () => [item] })
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'), 'utf8'), ctx);
  await ctx.self.onmessage({ data: { type: 'search', request: 99, query: 'بالنيات', group: 'kitab', sources } });
  const res = messages.at(-1);
  assert.equal(res?.total, 1);
  assert.equal(res.items[0].is_arabic_snippet, true);
  assert.match(res.items[0].snippet, /بِالنِّيَّاتِ/);
});


test('panah navigasi ditangani sekali di level dialog tanpa merebut fokus', () => {
  const src = fs.readFileSync(require.resolve('../js/hadith.js'), 'utf8');
  assert.match(src, /dialog\.addEventListener\('keydown'/, 'harus ada handler panah di level dialog');
  assert.match(src, /moveSelection\(event\.key === 'ArrowDown' \? 1 : -1\)/, 'panah memakai moveSelection');
  assert.doesNotMatch(src, /next\.click\(\)/, 'navigasi panah tidak boleh memakai klik (merebut fokus)');
  assert.doesNotMatch(src, /button\.onkeydown/, 'handler per-kartu dihapus agar tidak dobel');
  assert.match(src, /function moveSelection\(delta\)/, 'fungsi navigasi tunggal');
});


test('transliterasi toleran: th, ta marbuthah, dan kata sandang', () => {
  const cases = [
    ['at thuhuru syatrul iman', 'الطهور شطر الإيمان'],
    ['innamal amalu binniyat', 'إنما الأعمال بالنيات'],
    ['addinu nasihah', 'الدين النصيحة'],
    ["khairukum man ta'allamal qur'an", 'خيركم من تعلم القرآن وعلمه'],
  ];
  for (const [query, arabic] of cases) {
    assert.ok(E.scoreLatin({ item: { arabic } }, E.parse(query, 'latin')) > 0, query + ' harus menemukan teksnya');
  }
  // Frasa yang tidak berkaitan tidak boleh cocok.
  assert.equal(E.scoreLatin({ item: { arabic: 'إنما الأعمال بالنيات' } }, E.parse('kucing liar', 'latin')), 0);
});


test('frasa transliterasi tetap ditemukan walau tersisip di matan panjang', () => {
  const long = 'حَدَّثَنَا فُلَانٌ قَالَ قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ صَلَاةُ الْجَمَاعَةِ أَفْضَلُ مِنْ صَلَاةِ الْفَذِّ';
  assert.ok(E.scoreLatin({ item: { arabic: long } }, E.parse('shalatu jamaah', 'latin')) > 0,
    'frasa di tengah matan harus ditemukan');
  assert.equal(E.scoreLatin({ item: { arabic: long } }, E.parse('kucing liar', 'latin')), 0);
});


test('pencarian terjemahan mengenali imbuhan dan sinonim Indonesia', () => {
  const prep = (translation) => E.prepare({ translation });
  // Imbuhan dua arah
  assert.ok(E.score(prep('Berpuasa di bulan Ramadan'), E.parse('puasa')) > 0, 'berpuasa harus cocok dengan puasa');
  assert.ok(E.score(prep('Puasa itu perisai'), E.parse('berpuasa')) > 0, 'puasa harus cocok dengan berpuasa');
  assert.ok(E.score(prep('Keimanan seorang hamba'), E.parse('iman')) > 0, 'keimanan harus cocok dengan iman');
  // Sinonim dua arah
  assert.ok(E.score(prep('Shaum itu perisai'), E.parse('puasa')) > 0, 'shaum = puasa');
  assert.ok(E.score(prep('Puasa itu perisai'), E.parse('shaum')) > 0, 'puasa = shaum');
  assert.ok(E.score(prep('Bersedekah kepada fakir miskin'), E.parse('shodaqoh')) > 0, 'shodaqoh = sedekah');
  // Kata persis tetap mengalahkan varian.
  const exact = E.score(E.prepare({ translation: 'iman kepada Allah' }), E.parse('iman'));
  const stem = E.score(E.prepare({ translation: 'keimanan seorang hamba' }), E.parse('iman'));
  assert.ok(exact > stem, 'kata persis harus lebih tinggi daripada bentuk berimbuhan');
});


test('mode terjemahan hanya mencari di terjemahan, bukan judul/koleksi', () => {
  const inTitle = E.prepare({ title: 'Iman', translation: 'teks lain' });
  const inCollection = E.prepare({ collection: 'Iman', translation: 'teks lain' });
  const inTranslation = E.prepare({ translation: 'Iman kepada Allah' });
  const q = E.parse('iman', 'translation');
  assert.equal(E.score(inTitle, q), 0, 'judul tidak boleh ikut dicari');
  assert.equal(E.score(inCollection, q), 0, 'koleksi tidak boleh ikut dicari');
  assert.ok(E.score(inTranslation, q) > 0, 'terjemahan harus dicari');
});

test('worker membuang hasil yang jauh di bawah skor terbaik', async () => {
  const strong = { id: 's', title: '', collection: 'A', number: '1', arabic: '', translation: 'iman kepada Allah', reference: '' };
  const weak = Array.from({ length: 14 }, (_, i) => ({
    id: 'w' + i, title: '', collection: 'A', number: String(10 + i), arabic: '',
    translation: 'keimanan seorang hamba', reference: '',
  }));
  const items = [strong, ...weak];
  const messages = [];
  const ctx = {
    self: { HadithSearchEngine: E, location: { href: 'http://localhost/js/hadith-worker.js' } },
    importScripts() {}, postMessage: (m) => messages.push(m), URL, setTimeout,
    fetch: async () => ({ ok: true, json: async () => items }),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/hadith-worker.js'), 'utf8'), ctx);
  const sources = [{ id: 'a', group: 'kitab', file: 'a.json', label: 'A' }];
  await ctx.self.onmessage({ data: { type: 'search', request: 1, query: 'iman', mode: 'text', group: 'kitab', sources } });
  const result = messages.at(-1);
  assert.equal(result.type, 'results');
  assert.equal(result.total, 1, 'hanya hasil terbaik yang tersisa');
  assert.equal(result.items[0].id, 's');
});


test('riwayat pencarian: terbaru di depan, tanpa duplikat, dibatasi', () => {
  let list = [];
  list = E.historyAdd(list, { q: 'sabar', mode: 'text' }, 3);
  list = E.historyAdd(list, { q: 'puasa', mode: 'text' }, 3);
  assert.equal(list[0].q, 'puasa', 'terbaru di depan');
  list = E.historyAdd(list, { q: 'puasa', mode: 'text' }, 3);
  assert.equal(list.length, 2, 'kueri sama tidak digandakan');
  assert.equal(list[0].q, 'puasa', 'kueri yang diulang naik ke depan');
  list = E.historyAdd(list, { q: 'sabar', mode: 'latin' }, 3);
  assert.equal(list.length, 3, 'mode berbeda dianggap entri berbeda');
  list = E.historyAdd(list, { q: 'zakat', mode: 'text' }, 3);
  assert.equal(list.length, 3, 'dibatasi maksimal 3');
  assert.deepEqual(list.map((item) => item.q), ['zakat', 'sabar', 'puasa']);
  assert.equal(E.historyAdd(list, { q: '   ' }, 3).length, 3, 'kueri kosong diabaikan');
});


test('mode default pencarian adalah Terjemahan Indonesia', () => {
  const src = fs.readFileSync(require.resolve('../js/hadith.js'), 'utf8');
  assert.match(src, /<option value="translation" selected>Terjemahan Indonesia<\/option>/, 'opsi pertama harus terjemahan');
  assert.match(src, /mode = 'translation'/, 'variabel mode default harus translation');
  assert.match(src, /id="hd-mode-hint">Hanya terjemahan Indonesia/, 'hint awal harus menjelaskan mode terjemahan');
});

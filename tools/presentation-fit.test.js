const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('Quran fitter measures wrapping, restores short text and remeasures on resize', () => {
  const events = {}, probes = [];
  const wrap = {clientWidth:1800,querySelector:()=>({offsetHeight:40})};
  const element = {clientWidth:1600,style:{},innerHTML:'short',isConnected:true,cloneNode(){
    const probe={style:{},removeAttribute(){},setAttribute(){},innerHTML:'',
      get scrollHeight(){const size=parseFloat(this.style.fontSize);return Math.ceil(this.innerHTML.length*size*.55/parseFloat(this.style.width))*size*Number(this.style.lineHeight);},
      get scrollWidth(){return parseFloat(this.style.width);},remove(){this.removed=true;}};
    probes.push(probe);return probe;
  }};
  const ctx={window:{},innerHeight:1080,addEventListener:(name,fn)=>events[name]=fn,
    document:{getElementById:()=>wrap,body:{appendChild(){}},fonts:{addEventListener:(name,fn)=>events[name]=fn,ready:Promise.resolve()}},
    getComputedStyle:()=>({paddingLeft:'20px',paddingRight:'20px',paddingTop:'12px',paddingBottom:'22px',borderTopWidth:'4px',borderBottomWidth:'4px',marginBottom:'6px',gap:'20px',fontFamily:'Amiri',fontWeight:'600'})};
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/quran-text-fit.js'),'utf8'),ctx);
  const fit=ctx.window.QuranTextFit;
  assert.equal(fit.size(element,'short',76,26,2.2,true),76);
  const long=fit.size(element,'a'.repeat(600),76,26,2.2,true);
  assert.ok(long<76 && long>=26);
  assert.equal(fit.size(element,'short',76,26,2.2,true),76);
  element.innerHTML='a'.repeat(100);
  events.resize();const original=parseFloat(element.style.fontSize);
  ctx.innerHeight=480;events.resize();assert.ok(parseFloat(element.style.fontSize)<original);
  ctx.innerHeight=1080;events.loadingdone();assert.equal(parseFloat(element.style.fontSize),original);
  assert.equal(fit.size(element,'a'.repeat(100000),76,26,2.2,true),26);
  assert.ok(probes.every(probe=>probe.removed));
});

test('program feed preview receives the selected template from the start', () => {
  const monitor = fs.readFileSync(require.resolve('../js/confidenceMonitor.js'), 'utf8');
  // Src pratinjau harus membawa nama template tersimpan (bukan hanya ?obs).
  assert.match(monitor, /presentation\.html\?obs&template=/, 'pratinjau harus memuat template di URL-nya');
  // Setiap sinkronisasi juga membawa template, agar pratinjau bisa memulihkan diri.
  assert.match(monitor, /template: savedTemplate/, 'syncConfidenceMonitor harus menyertakan template');

  const html = fs.readFileSync(require.resolve('../presentation.html'), 'utf8');
  assert.match(html, /get\('template'\)/, 'presentation.html harus membaca parameter template');
  assert.match(html, /ALLOWED_TEMPLATE_FILES/, 'nama template dari URL harus divalidasi');

  // Markup panel tidak boleh lagi memakai src statis tanpa template.
  const index = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  assert.doesNotMatch(index, /id="confidenceMonitorFrame"[^>]*src="presentation\.html\?obs"/,
    'iframe pratinjau tidak boleh memakai src statis ?obs saja');
});

test('templates that adopted the shared runtime no longer duplicate polling', () => {
  const runtime = fs.readFileSync(require.resolve('../js/template-runtime.js'), 'utf8');
  new vm.Script(runtime); // harus berupa JavaScript yang sah
  assert.match(runtime, /window\.TemplateRuntime =/, 'runtime harus mengekspos TemplateRuntime');
  assert.match(runtime, /isEmbedded/, 'runtime harus tahu kapan berjalan di dalam induk');
  assert.match(runtime, /reportFit/, 'runtime harus menyediakan pelaporan teks terpotong');

  for (const name of ['pip_video', 'lower_third_dual', 'lower_third', 'lower_third_dark', 'lower_third_glass','lower_third_midnight','lower_third_paper','lower_third_dual_sapphire','lower_third_mihrab','fullscreen_mihrab','dual_mihrab']) {
    const html = fs.readFileSync(require.resolve('../templates/' + name + '.html'), 'utf8');
    assert.match(html, /src="\.\.\/js\/template-runtime\.js"/, name + ' harus memuat runtime bersama');
    assert.match(html, /TemplateRuntime\.init\(/, name + ' harus memakai TemplateRuntime.init');
    assert.doesNotMatch(html, /setInterval\(fallbackPoll/, name + ' tidak boleh punya polling sendiri lagi');
    assert.doesNotMatch(html, /addEventListener\('message'/, name + ' tidak boleh punya pendengar pesan sendiri lagi');
  }
});

test('template changes crossfade instead of reloading the live frame', () => {
  const html = fs.readFileSync(require.resolve('../presentation.html'), 'utf8');
  // Template baru dimuat di iframe tersembunyi lalu ditampilkan.
  assert.match(html, /function switchTemplate\(/, 'harus ada jalur ganti template');
  assert.match(html, /classList\.add\('is-live'\)/, 'template baru harus ditampilkan lewat kelas is-live');
  assert.match(html, /iframe\.is-live/, 'CSS harus punya aturan opacity untuk is-live');
  // frame.src hanya boleh dipakai untuk muatan awal dan jaring pengaman
  // (kalau crossfade gagal, layar tidak boleh hitam).
  const assignments = [...html.matchAll(/frame\.src\s*=/g)];
  assert.ok(assignments.length <= 2, 'frame.src hanya untuk muatan awal + fallback');
  assert.match(html, /const fallback = /, 'harus ada jaring pengaman bila crossfade gagal');
  // Ketiga jalur perubahan template harus lewat switchTemplate.
  const switches = [...html.matchAll(/switchTemplate\(/g)].length;
  assert.ok(switches >= 4, 'IPC, polling, dan pesan induk harus memakai switchTemplate');
});

test('templates size text by measurement, never by counting characters', () => {
  for(const name of ['default','lower_third','lower_third_dark','lower_third_dual','pip_video','lower_third_glass','lower_third_midnight','lower_third_paper','lower_third_dual_sapphire','lower_third_mihrab','fullscreen_mihrab','dual_mihrab']) {
    const html=fs.readFileSync(require.resolve('../templates/'+name+'.html'),'utf8');
    // Dua cara yang sah: fitter bersama (QuranTextFit.size) atau pengukuran
    // sendiri terhadap tinggi sebenarnya (scrollHeight + line-height), seperti
    // yang dipakai Chyron untuk tangga ukuran per jumlah baris.
    // Tiga cara yang sah: fitter bersama, helper DualFit (yang memakai fitter
    // bersama), atau pengukuran sendiri terhadap tinggi sebenarnya.
    const usesSharedFitter = /QuranTextFit\.size\(/.test(html);
    const usesDualFit = /DualFit\.apply\(/.test(html);
    const measuresItself = /scrollHeight/.test(html) && /lineHeight|LINE_HEIGHT/.test(html);
    assert.ok(usesSharedFitter || usesDualFit || measuresItself, name + ' harus mengukur teks, bukan menebak dari jumlah huruf');
    assert.doesNotMatch(html, /if \((?:arLen|trLen) >/);
    for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }

  // Helper yang dipakai template dua kolom juga harus benar-benar mengukur.
  const dualFit = fs.readFileSync(require.resolve('../js/dual-fit.js'), 'utf8');
  assert.match(dualFit, /QuranTextFit\.size\(/, 'DualFit harus memakai fitter bersama');
  assert.match(dualFit, /scrollHeight/, 'DualFit harus memeriksa luapan sebenarnya');
});

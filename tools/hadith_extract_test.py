import unittest
import build_hadith_data as b

class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.source={'source_id':'brosur-ahad-pagi-1995-2024','source_group':'brosur'}
    def blocks(self, texts):
        return [{'text':t,'images':[]} for t in texts]
    def test_brochure_requires_explicit_hadith_citation(self):
        blocks=self.blocks(['إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ','Sesungguhnya semua perbuatan bergantung pada niat. (HR. Bukhari)', 'Keterangan: Ini penjelasan panjang.'])
        rows=b.paired_entries(blocks,self.source,'1995/19950212.htm','Niat',True)
        self.assertEqual(len(rows),1)
        self.assertEqual(rows[0]['number'],'')
        self.assertNotIn('penjelasan',rows[0]['translation'])
        self.assertEqual(rows[0]['reference'],'(HR. Bukhari)')
    def test_quran_passage_is_not_brochure_hadith(self):
        rows=b.paired_entries(self.blocks(['إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ','Sesungguhnya Kami menurunkan peringatan. (QS. Al-Hijr: 9)']),self.source,'x','x',True)
        self.assertEqual(rows,[])
    def test_parser_collapses_word_html_whitespace_without_splitting_passage(self):
        parser=b.Blocks();parser.feed('<head><title>Skip</title></head><p>Dari\n <span>seorang</span> perawi.</p><script>ignore()</script>');parser.flush()
        self.assertEqual(parser.blocks,[{'text':'Dari seorang perawi.','images':[]}])
    def test_commentary_does_not_borrow_reference_from_a_later_quote(self):
        rows=b.paired_entries(self.blocks(['صُوْمُوْا تًصِحُّوْا','Berpuasalah maka kamu sekalian sehat.', 'Hadits tersebut dibahas panjang dalam artikel.', 'Kutipan lain yang menyebut sumber. (HR. Al-Bukhari dan Muslim)']),self.source,'x','x',True)
        self.assertEqual(rows,[])

if __name__=='__main__': unittest.main()

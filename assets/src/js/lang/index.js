import en_us from './langs/en_us.json';
import es_es from './langs/es_es.json';
import it_it from './langs/it_it.json';
import fr_fr from './langs/fr_fr.json';
import de_de from './langs/de_de.json';
import pt_br from './langs/pt_br.json';
import pt_pt from './langs/pt_pt.json';
import ja_jp from './langs/ja_jp.json';
import ko_kr from './langs/ko_kr.json';
import zh_cn from './langs/zh_cn.json';
import zh_tw from './langs/zh_tw.json';
import ru_ru from './langs/ru_ru.json';
import ar_sa from './langs/ar_sa.json';
import hi_in from './langs/hi_in.json';
import bn_bd from './langs/bn_bd.json';
import tr_tr from './langs/tr_tr.json';
import vi_vn from './langs/vi_vn.json';
import pl_pl from './langs/pl_pl.json';
import nl_nl from './langs/nl_nl.json';
import sv_se from './langs/sv_se.json';
import nb_no from './langs/nb_no.json';
import da_dk from './langs/da_dk.json';
import fi_fi from './langs/fi_fi.json';
import el_gr from './langs/el_gr.json';
import he_il from './langs/he_il.json';
import th_th from './langs/th_th.json';
import id_id from './langs/id_id.json';
import uk_ua from './langs/uk_ua.json';
import ro_ro from './langs/ro_ro.json';
import cs_cz from './langs/cs_cz.json';
import hu_hu from './langs/hu_hu.json';
import fa_ir from './langs/fa_ir.json';

export const LANGUAGES = [
  { id: 'en_us', name: 'English (US)', strings: en_us },
  { id: 'es_es', name: 'Español (España)', strings: es_es },
  { id: 'it_it', name: 'Italiano', strings: it_it },
  { id: 'fr_fr', name: 'Français', strings: fr_fr },
  { id: 'de_de', name: 'Deutsch', strings: de_de },
  { id: 'pt_br', name: 'Português (Brasil)', strings: pt_br },
  { id: 'pt_pt', name: 'Português (Portugal)', strings: pt_pt },
  { id: 'nl_nl', name: 'Nederlands', strings: nl_nl },
  { id: 'pl_pl', name: 'Polski', strings: pl_pl },
  { id: 'cs_cz', name: 'Čeština', strings: cs_cz },
  { id: 'hu_hu', name: 'Magyar', strings: hu_hu },
  { id: 'ro_ro', name: 'Română', strings: ro_ro },
  { id: 'sv_se', name: 'Svenska', strings: sv_se },
  { id: 'nb_no', name: 'Norsk Bokmål', strings: nb_no },
  { id: 'da_dk', name: 'Dansk', strings: da_dk },
  { id: 'fi_fi', name: 'Suomi', strings: fi_fi },
  { id: 'el_gr', name: 'Ελληνικά', strings: el_gr },
  { id: 'tr_tr', name: 'Türkçe', strings: tr_tr },
  { id: 'ru_ru', name: 'Русский', strings: ru_ru },
  { id: 'uk_ua', name: 'Українська', strings: uk_ua },
  { id: 'he_il', name: 'עברית', strings: he_il },
  { id: 'ar_sa', name: 'العربية', strings: ar_sa },
  { id: 'fa_ir', name: 'فارسی', strings: fa_ir },
  { id: 'hi_in', name: 'हिन्दी', strings: hi_in },
  { id: 'bn_bd', name: 'বাংলা', strings: bn_bd },
  { id: 'th_th', name: 'ไทย', strings: th_th },
  { id: 'vi_vn', name: 'Tiếng Việt', strings: vi_vn },
  { id: 'id_id', name: 'Bahasa Indonesia', strings: id_id },
  { id: 'zh_cn', name: '简体中文', strings: zh_cn },
  { id: 'zh_tw', name: '繁體中文', strings: zh_tw },
  { id: 'ja_jp', name: '日本語', strings: ja_jp },
  { id: 'ko_kr', name: '한국어', strings: ko_kr },
];
const langMap = {};
for (const l of LANGUAGES) langMap[l.id] = l;

export function getLangById(id) {
  return langMap[id] || langMap['en_us'];
}

export function getAllLanguages() {
  return LANGUAGES;
}
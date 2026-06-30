/* ════════ i18n — hand-built translations + RTL/LTR direction ════════
   Static UI elements carry data-i18n="<key>". applyI18n() swaps their text for the
   active language and flips document direction (RTL for Arabic/Hebrew, LTR otherwise).
   Dynamically-rendered views call t('<key>') where translated. Untranslated strings
   fall back to English, so nothing ever goes blank. */
const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);
const LANG_BY_NAME = { 'English':'en','Français':'fr','Español':'es','العربية':'ar','Português':'pt','Deutsch':'de','日本語':'ja','中文':'zh' };
const LANG_NAME_BY_CODE = Object.fromEntries(Object.entries(LANG_BY_NAME).map(([n,c]) => [c, n]));

const I18N = {
  en: { 'nav.home':'Home','nav.vote':'Vote Players','nav.voteShort':'Vote','nav.leaderboard':'Leaderboard','nav.compare':'Compare Players','nav.compareShort':'Compare','nav.predictions':'Predictions','nav.predictxi':'Predict the XI','nav.predictxiShort':'Predict XI','nav.games':'Games','nav.store':'Store','nav.notifications':'Notifications','nav.analytics':'Analytics','nav.transactions':'Transactions','nav.profile':'Profile','nav.settings':'Settings',
        'set.account':'Account','set.profile':'Profile','set.preferences':'Preferences','set.notifications':'Notifications','set.privacy':'Privacy & Security','set.linked':'Linked Accounts','set.language':'Language','set.about':'About','set.signout':'Sign Out','set.langTitle':'Language','set.regionTitle':'Region & Format' },
  fr: { 'nav.home':'Accueil','nav.vote':'Voter pour les joueurs','nav.voteShort':'Voter','nav.leaderboard':'Classement','nav.compare':'Comparer les joueurs','nav.compareShort':'Comparer','nav.predictions':'Pronostics','nav.predictxi':'Composer le XI','nav.predictxiShort':'Composer XI','nav.games':'Matchs','nav.store':'Boutique','nav.notifications':'Notifications','nav.analytics':'Statistiques','nav.transactions':'Transactions','nav.profile':'Profil','nav.settings':'Paramètres',
        'set.account':'Compte','set.profile':'Profil','set.preferences':'Préférences','set.notifications':'Notifications','set.privacy':'Confidentialité et sécurité','set.linked':'Comptes liés','set.language':'Langue','set.about':'À propos','set.signout':'Se déconnecter','set.langTitle':'Langue','set.regionTitle':'Région et format' },
  es: { 'nav.home':'Inicio','nav.vote':'Votar jugadores','nav.voteShort':'Votar','nav.leaderboard':'Clasificación','nav.compare':'Comparar jugadores','nav.compareShort':'Comparar','nav.predictions':'Predicciones','nav.predictxi':'Predecir el XI','nav.predictxiShort':'Predecir XI','nav.games':'Partidos','nav.store':'Tienda','nav.notifications':'Notificaciones','nav.analytics':'Analíticas','nav.transactions':'Transacciones','nav.profile':'Perfil','nav.settings':'Configuración',
        'set.account':'Cuenta','set.profile':'Perfil','set.preferences':'Preferencias','set.notifications':'Notificaciones','set.privacy':'Privacidad y seguridad','set.linked':'Cuentas vinculadas','set.language':'Idioma','set.about':'Acerca de','set.signout':'Cerrar sesión','set.langTitle':'Idioma','set.regionTitle':'Región y formato' },
  ar: { 'nav.home':'الرئيسية','nav.vote':'التصويت للاعبين','nav.voteShort':'تصويت','nav.leaderboard':'المتصدرون','nav.compare':'مقارنة اللاعبين','nav.compareShort':'مقارنة','nav.predictions':'التوقعات','nav.predictxi':'توقع التشكيلة','nav.predictxiShort':'توقع التشكيلة','nav.games':'المباريات','nav.store':'المتجر','nav.notifications':'الإشعارات','nav.analytics':'التحليلات','nav.transactions':'المعاملات','nav.profile':'الملف الشخصي','nav.settings':'الإعدادات',
        'set.account':'الحساب','set.profile':'الملف الشخصي','set.preferences':'التفضيلات','set.notifications':'الإشعارات','set.privacy':'الخصوصية والأمان','set.linked':'الحسابات المرتبطة','set.language':'اللغة','set.about':'حول','set.signout':'تسجيل الخروج','set.langTitle':'اللغة','set.regionTitle':'المنطقة والتنسيق' },
  pt: { 'nav.home':'Início','nav.vote':'Votar em jogadores','nav.voteShort':'Votar','nav.leaderboard':'Classificação','nav.compare':'Comparar jogadores','nav.compareShort':'Comparar','nav.predictions':'Previsões','nav.predictxi':'Prever o XI','nav.predictxiShort':'Prever XI','nav.games':'Jogos','nav.store':'Loja','nav.notifications':'Notificações','nav.analytics':'Análises','nav.transactions':'Transações','nav.profile':'Perfil','nav.settings':'Configurações',
        'set.account':'Conta','set.profile':'Perfil','set.preferences':'Preferências','set.notifications':'Notificações','set.privacy':'Privacidade e segurança','set.linked':'Contas vinculadas','set.language':'Idioma','set.about':'Sobre','set.signout':'Sair','set.langTitle':'Idioma','set.regionTitle':'Região e formato' },
  de: { 'nav.home':'Startseite','nav.vote':'Spieler wählen','nav.voteShort':'Wählen','nav.leaderboard':'Bestenliste','nav.compare':'Spieler vergleichen','nav.compareShort':'Vergleichen','nav.predictions':'Vorhersagen','nav.predictxi':'Elf vorhersagen','nav.predictxiShort':'Elf wählen','nav.games':'Spiele','nav.store':'Shop','nav.notifications':'Benachrichtigungen','nav.analytics':'Statistiken','nav.transactions':'Transaktionen','nav.profile':'Profil','nav.settings':'Einstellungen',
        'set.account':'Konto','set.profile':'Profil','set.preferences':'Präferenzen','set.notifications':'Benachrichtigungen','set.privacy':'Datenschutz & Sicherheit','set.linked':'Verknüpfte Konten','set.language':'Sprache','set.about':'Über','set.signout':'Abmelden','set.langTitle':'Sprache','set.regionTitle':'Region & Format' },
  ja: { 'nav.home':'ホーム','nav.vote':'選手に投票','nav.voteShort':'投票','nav.leaderboard':'ランキング','nav.compare':'選手を比較','nav.compareShort':'比較','nav.predictions':'予想','nav.predictxi':'スタメン予想','nav.predictxiShort':'スタメン','nav.games':'試合','nav.store':'ストア','nav.notifications':'通知','nav.analytics':'分析','nav.transactions':'取引','nav.profile':'プロフィール','nav.settings':'設定',
        'set.account':'アカウント','set.profile':'プロフィール','set.preferences':'環境設定','set.notifications':'通知','set.privacy':'プライバシーとセキュリティ','set.linked':'連携アカウント','set.language':'言語','set.about':'アプリについて','set.signout':'ログアウト','set.langTitle':'言語','set.regionTitle':'地域とフォーマット' },
  zh: { 'nav.home':'首页','nav.vote':'为球员投票','nav.voteShort':'投票','nav.leaderboard':'排行榜','nav.compare':'对比球员','nav.compareShort':'对比','nav.predictions':'预测','nav.predictxi':'预测首发','nav.predictxiShort':'预测首发','nav.games':'赛事','nav.store':'商店','nav.notifications':'通知','nav.analytics':'分析','nav.transactions':'交易','nav.profile':'个人资料','nav.settings':'设置',
        'set.account':'账户','set.profile':'个人资料','set.preferences':'偏好设置','set.notifications':'通知','set.privacy':'隐私与安全','set.linked':'关联账户','set.language':'语言','set.about':'关于','set.signout':'退出登录','set.langTitle':'语言','set.regionTitle':'地区与格式' }
};

function t(key) {
  const l = (typeof state !== 'undefined' && state.lang) || 'en';
  return (I18N[l] && I18N[l][key]) || (I18N.en && I18N.en[key]) || key;
}

// Translate every [data-i18n] element. If the element holds child elements (an icon, a badge),
// only its trailing text label is swapped so the icon/badge are preserved.
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.getAttribute('data-i18n'));
    if (!v) return;
    if (el.children.length) {
      const txt = [...el.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
      if (txt) { txt.textContent = v; return; }
    }
    el.textContent = v;
  });
  const l = (typeof state !== 'undefined' && state.lang) || 'en';
  const rtl = RTL_LANGS.has(l);
  document.documentElement.lang = l;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', rtl);
}

function setLang(code) {
  if (typeof state !== 'undefined') state.lang = code;
  try { localStorage.setItem('wc26_lang', code); } catch (e) {}
  applyI18n();
}

function initLang() {
  let l = 'en';
  try { l = localStorage.getItem('wc26_lang') || 'en'; } catch (e) {}
  if (typeof state !== 'undefined') state.lang = l;
  applyI18n();
}

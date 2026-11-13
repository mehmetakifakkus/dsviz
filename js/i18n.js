/*
 * Languages and settings. Loaded in <head> before anything else:
 * - the settings (language, theme, default speed, narration, lost-node warnings, code
 *   font size) live in localStorage under "dsv-settings";
 * - the language is the saved one, else the browser's (tr, de), else English;
 * - the theme and the font size are applied before the page is drawn;
 * - dsv.t(key, vars) returns the text of a key in the current language; {name} in a text
 *   is replaced by vars.name.
 * Page content (headings, explanations, code comments) is translated in the pages
 * themselves: elements with data-lang, code variants in <script type="text/plain">.
 */
(function(){

	var LANGS = ['tr', 'en', 'de'];
	var DEFAULTS = {lang: null, theme: 'system', speed: 2, narration: true, warnings: true, stepCompare: true, fontSize: 'normal', lessonMode: false, codeLang: 'dugum'};

	var TEXT = {
		// ---------------- page chrome (js/layout.js) ----------------
		brand: {tr: 'Bağlı Listeler', en: 'Linked Lists', de: 'Verkettete Listen'},
		lessonLead: {
			tr: 'Blokları sırayla çalıştırın. Bir bloğu çalıştırdığınızda üstündeki bloklar da kendiliğinden yeniden çalışır ve çizim temiz başlar. Animasyonu sağdaki düğmelerle adım adım ileri ve geri oynatabilirsiniz.',
			en: 'Run the blocks in order. When you run a block, the blocks above it run again automatically and the drawing starts clean. Use the buttons on the right to play the animation step by step, forwards and backwards.',
			de: 'Führen Sie die Blöcke der Reihe nach aus. Wenn Sie einen Block ausführen, laufen die Blöcke darüber automatisch erneut und die Zeichnung beginnt sauber. Mit den Schaltflächen rechts spielen Sie die Animation Schritt für Schritt vor und zurück ab.'
		},
		examples: {tr: 'Örnekler', en: 'Examples', de: 'Beispiele'},
		close: {tr: 'Kapat', en: 'Close', de: 'Schließen'},
		homeLink: {tr: 'Ana sayfa ve deneme alanı', en: 'Home and playground', de: 'Startseite und Spielwiese'},
		block: {tr: 'Blok {n}', en: 'Block {n}', de: 'Block {n}'},
		previous: {tr: '← Önceki', en: '← Previous', de: '← Zurück'},
		next: {tr: 'Sonraki →', en: 'Next →', de: 'Weiter →'},
		footer: {
			tr: 'Bu uygulama {author} tarafından paper.js, peg.js ve CodeMirror kullanılarak geliştirilmiştir. Orta Doğu Teknik Üniversitesi, Bilgisayar Mühendisliği Bölümü.',
			en: 'This app was developed by {author} with paper.js, peg.js and CodeMirror. Middle East Technical University, Department of Computer Engineering.',
			de: 'Diese App wurde von {author} mit paper.js, peg.js und CodeMirror entwickelt. Middle East Technical University, Fakultät für Informatik.'
		},
		callStack: {tr: 'Çağrı yığını', en: 'Call stack', de: 'Aufrufstapel'},
		variables: {tr: 'Değişkenler', en: 'Variables', de: 'Variablen'},
		noVariables: {tr: 'Henüz değişken yok.', en: 'No variables yet.', de: 'Noch keine Variablen.'},
		output: {tr: 'Çıktı', en: 'Output', de: 'Ausgabe'},
		outputEmpty: {tr: 'Çıktı burada görünür.', en: 'Output appears here.', de: 'Die Ausgabe erscheint hier.'},
		commandTab: {tr: 'Komut satırı', en: 'Command line', de: 'Befehlszeile'},
		commandHint: {
			tr: 'Tek satırlık kod yazıp Enter\'a basın, ör. <code>x.next.data</code>. Yukarı/aşağı ok tuşları önceki komutları getirir.',
			en: 'Type one line of code and press Enter, e.g. <code>x.next.data</code>. The up/down arrow keys bring back earlier commands.',
			de: 'Geben Sie eine Zeile Code ein und drücken Sie Enter, z. B. <code>x.next.data</code>. Die Pfeiltasten hoch/runter holen frühere Befehle zurück.'
		},
		cycleBack: {tr: '↺ yine [{data}] düğümüne döner', en: '↺ back to [{data}]', de: '↺ zurück zu [{data}]'},
		commandOk: {tr: 'Başarıyla çalıştı', en: 'Done', de: 'Ausgeführt'},
		commandError: {tr: 'Hata!', en: 'Error!', de: 'Fehler!'},

		// ---------------- settings ----------------
		settings: {tr: 'Ayarlar', en: 'Settings', de: 'Einstellungen'},
		language: {tr: 'Dil', en: 'Language', de: 'Sprache'},
		languageNote: {tr: 'Dil değişince sayfa yeniden yüklenir.', en: 'Changing the language reloads the page.', de: 'Beim Sprachwechsel wird die Seite neu geladen.'},
		theme: {tr: 'Tema', en: 'Theme', de: 'Design'},
		themeSystem: {tr: 'Sistem', en: 'System', de: 'System'},
		themeLight: {tr: 'Açık', en: 'Light', de: 'Hell'},
		themeDark: {tr: 'Koyu', en: 'Dark', de: 'Dunkel'},
		defaultSpeed: {tr: 'Animasyon hızı', en: 'Animation speed', de: 'Animationstempo'},
		speeds: {
			tr: ['Çok yavaş', 'Yavaş', 'Normal', 'Hızlı', 'Çok hızlı'],
			en: ['Very slow', 'Slow', 'Normal', 'Fast', 'Very fast'],
			de: ['Sehr langsam', 'Langsam', 'Normal', 'Schnell', 'Sehr schnell']
		},
		tourNext: {tr: 'Sonraki', en: 'Next', de: 'Weiter'},
		tourBack: {tr: 'Geri', en: 'Back', de: 'Zurück'},
		tourDone: {tr: 'Başlayalım', en: "Let's start", de: 'Los geht\'s'},
		tourSkip: {tr: 'Turu atla', en: 'Skip the tour', de: 'Tour überspringen'},
		tourCount: {tr: '{i} / {n}', en: '{i} / {n}', de: '{i} / {n}'},
		tourRestart: {tr: 'Tanıtım turunu yeniden başlat', en: 'Start the introduction tour again', de: 'Einführungstour erneut starten'},
		tourSteps: {
			tr: [
				['Hoş geldiniz', 'Burada veri yapılarının kodunu çalıştırıp her adımı çizimde izlersiniz. Bu kısa tur sayfanın bölümlerini tanıtır; Sonraki ile ilerleyin, istediğiniz an atlayabilirsiniz.'],
				['Kod blokları', 'Örnekler Düğüm dilinde yazılmıştır: JavaScript\'e benzeyen, bu iş için geliştirilmiş sade bir dil. Kodu değiştirip yeniden çalıştırabilirsiniz.'],
				['Çalıştır', 'Bloğu çalıştırır. Üstündeki bloklar da kendiliğinden yeniden çalışır, çizim her seferinde temiz başlar.'],
				['Çizim', 'Düğümler, bağlar (oklar) ve pointer\'lar burada çizilir. Son adımda değişen bağ turuncu görünür, eski hali soluk ve kesik çizgiyle arkada kalır; ulaşılamayan düğümler uyarıyla işaretlenir.'],
				['Oynatıcı', 'Çalışmayı adım adım geri ve ileri oynatın, hızı ayarlayın ya da çubukla istediğiniz adıma gidin. Klavyede ← → ve boşluk tuşu da çalışır.'],
				['Anlatım', 'Her adımda ne olduğu bir cümleyle anlatılır; kodda o anda çalışan satır da vurgulanır.'],
				['Değişkenler ve çıktı', 'Değişkenlerin o adımdaki değerleri, fonksiyon çağrıları ve programın çıktısı burada. Komut satırı sekmesinden tek satırlık kod da deneyebilirsiniz.'],
				['Ders modu', 'Sayfayı bölüm bölüm izlemek için: her bölümde bir açıklama ve bir kod bloğu, bölümün kodu kendiliğinden çalışır.'],
				['Kod dili: Düğüm, C++ ya da Java', 'Site Düğüm diliyle açılır. Derste C++ ya da Java kullanıyorsanız buradan seçin: bütün örnekler o dile çevrilerek gösterilir ve öyle çalışır. Türkçe kelimelerle yazılan Düğüm de seçilebilir. Arayüz dili, tema ve yazı boyutu da bu panelde.'],
				['Örnekler', 'Bütün konular bu menüde: bağlı listeler, yığın ve kuyruk, sıralama, ağaçlar, heap ve hash tablosu. Düğüm dilinin rehberi "Başlarken" bölümünde.']
			],
			en: [
				['Welcome', 'Here you run the code of data structures and follow every step in the drawing. This short tour shows the parts of the page; go on with Next, and skip it whenever you like.'],
				['Code blocks', 'The examples are written in Düğüm: a small language like JavaScript, made for this site. You can change the code and run it again.'],
				['Run', 'Runs the block. The blocks above it run again by themselves, so the drawing always starts clean.'],
				['Drawing', 'Nodes, links (arrows) and pointers are drawn here. The link the last step changed is orange and how it was before stays behind it, faded and dashed; nodes nothing reaches any more are marked with a warning.'],
				['Player', 'Play the run step by step backwards and forwards, set the speed or jump to a step with the slider. The keys ← → and space work too.'],
				['Narration', 'Every step is told in a sentence, and the line that runs is highlighted in the code.'],
				['Variables and output', 'The values of the variables at this step, the function calls and the output of the program. In the command line tab you can try a single line of code.'],
				['Lesson mode', 'To go through the page part by part: each part has an explanation and a code block, and its code runs by itself.'],
				['Code language: Düğüm, C++ or Java', 'The site opens in Düğüm. If your course uses C++ or Java, choose it here: all examples are shown and run in that language. Düğüm with Turkish words is there too. The interface language, the theme and the font size are in this panel as well.'],
				['Examples', 'All topics are in this menu: linked lists, stacks and queues, sorting, trees, heaps and hash tables. The guide to the Düğüm language is under "Getting started".']
			],
			de: [
				['Willkommen', 'Hier führen Sie den Code von Datenstrukturen aus und verfolgen jeden Schritt in der Zeichnung. Diese kurze Tour zeigt die Teile der Seite; mit Weiter geht es voran, überspringen können Sie jederzeit.'],
				['Codeblöcke', 'Die Beispiele sind in Düğüm geschrieben: einer kleinen, JavaScript-ähnlichen Sprache, die für diese Seite gemacht ist. Sie können den Code ändern und erneut ausführen.'],
				['Ausführen', 'Führt den Block aus. Die Blöcke darüber laufen von selbst erneut, so beginnt die Zeichnung immer sauber.'],
				['Zeichnung', 'Knoten, Verbindungen (Pfeile) und Zeiger werden hier gezeichnet. Die Verbindung, die der letzte Schritt geändert hat, ist orange, ihr früherer Zustand bleibt blass und gestrichelt dahinter; Knoten, die nichts mehr erreicht, werden mit einer Warnung markiert.'],
				['Player', 'Spielen Sie den Ablauf Schritt für Schritt vor und zurück, stellen Sie die Geschwindigkeit ein oder springen Sie mit dem Regler zu einem Schritt. Die Tasten ← → und Leertaste funktionieren auch.'],
				['Erzählung', 'Jeder Schritt wird in einem Satz erklärt, und die laufende Zeile wird im Code hervorgehoben.'],
				['Variablen und Ausgabe', 'Die Werte der Variablen in diesem Schritt, die Funktionsaufrufe und die Ausgabe des Programms. Im Reiter Befehlszeile können Sie eine einzelne Codezeile ausprobieren.'],
				['Lektionsmodus', 'Um die Seite Teil für Teil durchzugehen: jeder Teil hat eine Erklärung und einen Codeblock, dessen Code von selbst läuft.'],
				['Code-Sprache: Düğüm, C++ oder Java', 'Die Seite öffnet sich in Düğüm. Wenn Ihr Kurs C++ oder Java benutzt, wählen Sie es hier: alle Beispiele werden in dieser Sprache gezeigt und ausgeführt. Düğüm mit türkischen Wörtern gibt es auch. Oberflächensprache, Design und Schriftgröße finden Sie ebenfalls in diesem Bereich.'],
				['Beispiele', 'Alle Themen stehen in diesem Menü: verkettete Listen, Stapel und Warteschlangen, Sortieren, Bäume, Heaps und Hashtabellen. Der Leitfaden zur Sprache Düğüm steht unter „Erste Schritte“.']
			]
		},
		codeLang: {tr: 'Kod dili', en: 'Code language', de: 'Code-Sprache'},
		codeLangNote: {tr: 'Örnekler seçilen dilde gösterilir ve çalışır; değişince sayfa yeniden yüklenir.', en: 'The examples are shown and run in the chosen language; changing it reloads the page.', de: 'Die Beispiele werden in der gewählten Sprache gezeigt und ausgeführt; beim Wechsel wird die Seite neu geladen.'},
		lessonModeSetting: {tr: 'Ders modu: blokları tek tek göster', en: 'Lesson mode: one block at a time', de: 'Lektionsmodus: ein Block nach dem anderen'},
		lessonOn: {tr: 'Ders modu', en: 'Lesson mode', de: 'Lektionsmodus'},
		lessonOnTitle: {tr: 'Sayfayı adım adım göster: her seferinde bir açıklama ve bir kod bloğu', en: 'Show the page step by step: one explanation and one code block at a time', de: 'Die Seite Schritt für Schritt zeigen: jeweils eine Erklärung und ein Codeblock'},
		lessonOff: {tr: 'Tüm sayfayı göster', en: 'Show the whole page', de: 'Ganze Seite zeigen'},
		lessonPart: {tr: 'Bölüm {i} / {n}', en: 'Part {i} of {n}', de: 'Teil {i} von {n}'},
		narrationSetting: {tr: 'Adım anlatımı', en: 'Step narration', de: 'Schrittbeschreibung'},
		exCheck: {tr: 'Kontrol et', en: 'Check', de: 'Prüfen'},
		exOk: {tr: 'Doğru! Alıştırma tamam.', en: 'Correct! Exercise done.', de: 'Richtig! Übung geschafft.'},
		exBad: {tr: 'Henüz değil.', en: 'Not yet.', de: 'Noch nicht.'},
		exExpected: {tr: '{label}: beklenen {expected}, senin sonucun {actual}', en: '{label}: expected {expected}, your result {actual}', de: '{label}: erwartet {expected}, dein Ergebnis {actual}'},
		exHint: {tr: 'İpucu ({i} / {n})', en: 'Hint ({i} / {n})', de: 'Tipp ({i} / {n})'},
		exHintLocked: {tr: 'Bir sonraki ipucu bir denemeden sonra açılır.', en: 'The next hint opens after an attempt.', de: 'Der nächste Tipp wird nach einem Versuch freigeschaltet.'},
		exSolution: {tr: 'Çözümü göster', en: 'Show the solution', de: 'Lösung zeigen'},
		exSolutionTitle: {tr: 'Örnek çözüm', en: 'Example solution', de: 'Beispiellösung'},
		exDone: {tr: 'Yapıldı ✓', en: 'Done ✓', de: 'Geschafft ✓'},
		exHistory: {tr: 'Önceki denemelerim ({n})', en: 'My previous attempts ({n})', de: 'Meine bisherigen Versuche ({n})'},
		exHistLoad: {tr: 'Bu kodu editöre yükle', en: 'Load this code into the editor', de: 'Diesen Code in den Editor laden'},
		exHistOtherLang: {tr: 'Bu deneme başka bir kod dilinde yazılmış ({lang}).', en: 'This attempt was written in another code language ({lang}).', de: 'Dieser Versuch ist in einer anderen Codesprache geschrieben ({lang}).'},
		exHistClear: {tr: 'Geçmişi temizle', en: 'Clear the history', de: 'Verlauf löschen'},
		exHistPass: {tr: 'Geçti', en: 'Passed', de: 'Bestanden'},
		exHistFail: {tr: 'Kaldı', en: 'Failed', de: 'Nicht bestanden'},
		exHistError: {tr: 'Kod çalışmadı', en: 'The code did not run', de: 'Der Code lief nicht'},
		exCmpExpected: {tr: 'Beklenen', en: 'Expected', de: 'Erwartet'},
		exCmpActual: {tr: 'Senin sonucun', en: 'Your result', de: 'Dein Ergebnis'},
		exCmpEmpty: {tr: 'boş', en: 'empty', de: 'leer'},
		exAttemptOne: {tr: '1 deneme', en: '1 attempt', de: '1 Versuch'},
		exAttempts: {tr: '{n} deneme', en: '{n} attempts', de: '{n} Versuche'},
		exRunError: {tr: 'Kodunda bir hata var; önce onu düzelt (Çıktı panelinde yazıyor).', en: 'There is an error in your code; fix it first (it is in the Output panel).', de: 'In deinem Code ist ein Fehler; behebe ihn zuerst (er steht im Ausgabe-Bereich).'},
		exTestError: {tr: 'Kontrol çalışırken kodun bir hata verdi: {error}', en: 'Your code failed while it was checked: {error}', de: 'Dein Code ist bei der Prüfung fehlgeschlagen: {error}'},
		ppClassTitle: {tr: 'Sınıf', en: 'Class', de: 'Klasse'},
		ppClassCode: {tr: 'Bu bağlantı bir sınıfa ait (kod {code}). Katılırsan bu plandaki alıştırmalardaki kontrollerin (sonuç, kod, hata) öğretmenine gider. Öğretmen seni gerçek adınla değil, yazdığın takma adla görür; katılmadan önce yaptıkların gönderilmez.', en: 'This link belongs to a class (code {code}). If you join, your checks in this plan\'s exercises (result, code, error) go to your teacher. Your teacher sees the nickname you type, not your name; what you did before joining is not sent.', de: 'Dieser Link gehört zu einer Klasse (Code {code}). Wenn du beitrittst, gehen deine Prüfungen in den Übungen dieses Plans (Ergebnis, Code, Fehler) an deine Lehrkraft. Sie sieht den Spitznamen, den du eingibst, nicht deinen Namen; was du vor dem Beitritt gemacht hast, wird nicht gesendet.'},
		ppNick: {tr: 'Takma adın (en çok 30 karakter)', en: 'Your nickname (at most 30 characters)', de: 'Dein Spitzname (höchstens 30 Zeichen)'},
		ppJoin: {tr: 'Sınıfa katıl', en: 'Join the class', de: 'Der Klasse beitreten'},
		ppMember: {tr: '{name} sınıfına {nick} olarak katıldın.', en: 'You joined {name} as {nick}.', de: 'Du bist {name} als {nick} beigetreten.'},
		ppChange: {tr: 'Ben değilim / değiştir', en: 'Not me / change', de: 'Nicht ich / wechseln'},
		ppLeave: {tr: 'Sınıftan ayrıl', en: 'Leave the class', de: 'Klasse verlassen'},
		ppLeaveDelete: {tr: 'Ayrıl ve verilerimi sil', en: 'Leave and delete my data', de: 'Verlassen und meine Daten löschen'},
		ppSwitchQ: {tr: 'Bu tarayıcı başka bir sınıfa bağlı ({name}). O sınıftan ayrılıp bu sınıfa katılmak istiyor musun?', en: 'This browser belongs to another class ({name}). Leave it and join this class?', de: 'Dieser Browser gehört zu einer anderen Klasse ({name}). Sie verlassen und dieser Klasse beitreten?'},
		ppJoinClosed: {tr: 'Bu sınıf yeni katılıma kapalı. Öğretmenine sor.', en: 'This class is closed to new students. Ask your teacher.', de: 'Diese Klasse nimmt niemanden mehr auf. Frag deine Lehrkraft.'},
		ppJoinNoClass: {tr: 'Bu kodla bir sınıf yok; bağlantıyı öğretmeninden yeniden iste.', en: 'There is no class with this code; ask your teacher for the link again.', de: 'Es gibt keine Klasse mit diesem Code; bitte deine Lehrkraft erneut um den Link.'},
		ppClassOff: {tr: 'Bu bağlantı bir sınıfa ait, ama sınıf özelliği bu sitede açık değil.', en: 'This link belongs to a class, but the classroom is not set up on this site.', de: 'Dieser Link gehört zu einer Klasse, aber die Klassenfunktion ist hier nicht eingerichtet.'},
		exClassSending: {tr: '{nick} olarak öğretmenine gönderiliyor.', en: 'Sent to your teacher as {nick}.', de: 'Wird als {nick} an deine Lehrkraft gesendet.'},
		exClassChange: {tr: 'Değiştir', en: 'Change', de: 'Wechseln'},
		exClassSent: {tr: 'Öğretmenine gönderildi.', en: 'Sent to your teacher.', de: 'An deine Lehrkraft gesendet.'},
		exClassQueued: {tr: 'Gönderilemedi; sonra yeniden denenecek.', en: 'Could not be sent; it will be tried again later.', de: 'Konnte nicht gesendet werden; es wird später erneut versucht.'},
		exClassRemoved: {tr: 'Öğretmenin seni sınıftan çıkardı ya da sınıf silindi; sonuçların artık gönderilmiyor.', en: 'Your teacher removed you from the class or the class was deleted; your results are not sent any more.', de: 'Deine Lehrkraft hat dich aus der Klasse entfernt oder die Klasse gelöscht; deine Ergebnisse werden nicht mehr gesendet.'},
		classLink: {tr: 'Sınıflarım (öğretmenler)', en: 'My classes (teachers)', de: 'Meine Klassen (Lehrkräfte)'},
		tpClass: {tr: 'Bu planla sınıf aç', en: 'Open a class with this plan', de: 'Mit diesem Plan eine Klasse eröffnen'},
		clNotSetUp: {tr: 'Sınıf özelliği bu sitede henüz kurulmadı. Kurulum adımları README dosyasında ("Sınıf kurulumu").', en: 'The classroom is not set up on this site yet. The setup steps are in the README ("Sınıf kurulumu").', de: 'Die Klassenfunktion ist auf dieser Seite noch nicht eingerichtet. Die Schritte stehen in der README („Sınıf kurulumu“).'},
		clIntro: {tr: 'Öğretmen hesabınızla girin. Bir ders planıyla sınıf açın, öğrencilere bağlantıyı verin; alıştırma sonuçları burada görünür. Öğrenciler yalnızca bir takma adla katılır.', en: 'Sign in with your teacher account. Open a class with a lesson plan and give your students the link; their exercise results show up here. Students join with a nickname only.', de: 'Melden Sie sich mit Ihrem Lehrkraftkonto an. Eröffnen Sie eine Klasse mit einem Unterrichtsplan und geben Sie den Lernenden den Link; ihre Übungsergebnisse erscheinen hier. Lernende treten nur mit einem Spitznamen bei.'},
		clEmail: {tr: 'E-posta', en: 'E-mail', de: 'E-Mail'},
		clPassword: {tr: 'Şifre (en az 6 karakter)', en: 'Password (at least 6 characters)', de: 'Passwort (mindestens 6 Zeichen)'},
		clSignIn: {tr: 'Giriş yap', en: 'Sign in', de: 'Anmelden'},
		clSignUp: {tr: 'Hesap aç', en: 'Create an account', de: 'Konto erstellen'},
		clReset: {tr: 'Şifremi unuttum', en: 'I forgot my password', de: 'Passwort vergessen'},
		clResetSent: {tr: 'Şifre sıfırlama e-postası gönderildi.', en: 'A password reset e-mail was sent.', de: 'Eine E-Mail zum Zurücksetzen des Passworts wurde gesendet.'},
		clSignOut: {tr: 'Çıkış', en: 'Sign out', de: 'Abmelden'},
		clSignedInAs: {tr: '{email} olarak girildi', en: 'Signed in as {email}', de: 'Angemeldet als {email}'},
		clVerifyNote: {tr: 'Sınıf açmak için e-posta adresinizi doğrulayın: gelen kutunuzdaki bağlantıya tıklayın, sonra aşağıdaki düğmeye basın.', en: 'Verify your e-mail address to open a class: click the link in your inbox, then press the button below.', de: 'Bestätigen Sie Ihre E-Mail-Adresse, um eine Klasse zu eröffnen: klicken Sie auf den Link in Ihrem Posteingang und dann auf die Schaltfläche unten.'},
		clRecheck: {tr: 'Doğruladım, yeniden kontrol et', en: 'I verified it, check again', de: 'Bestätigt, erneut prüfen'},
		clResend: {tr: 'E-postayı yeniden gönder', en: 'Send the e-mail again', de: 'E-Mail erneut senden'},
		clVerifySent: {tr: 'Doğrulama e-postası gönderildi.', en: 'The verification e-mail was sent.', de: 'Die Bestätigungs-E-Mail wurde gesendet.'},
		clNewClass: {tr: 'Yeni sınıf', en: 'New class', de: 'Neue Klasse'},
		clName: {tr: 'Sınıfın adı', en: 'Name of the class', de: 'Name der Klasse'},
		clPlanLink: {tr: 'Ders planı bağlantısı', en: 'Lesson plan link', de: 'Link zum Unterrichtsplan'},
		clPlanHint: {tr: 'Öğretmen sayfasında "Bu planla sınıf aç" ile gelir ya da plan bağlantısını buraya yapıştırın.', en: 'It comes from "Open a class with this plan" on the teachers\' page, or paste a plan link here.', de: 'Kommt über „Mit diesem Plan eine Klasse eröffnen“ auf der Lehrkraftseite, oder fügen Sie hier einen Planlink ein.'},
		clCreate: {tr: 'Sınıfı aç', en: 'Open the class', de: 'Klasse eröffnen'},
		clMyClasses: {tr: 'Sınıflarım', en: 'My classes', de: 'Meine Klassen'},
		clNoClasses: {tr: 'Henüz sınıf yok.', en: 'No classes yet.', de: 'Noch keine Klassen.'},
		clOpenClass: {tr: 'Aç', en: 'Open', de: 'Öffnen'},
		clStudentLink: {tr: 'Öğrencilere verilecek bağlantı', en: 'The link for your students', de: 'Der Link für die Lernenden'},
		clCopy: {tr: 'Kopyala', en: 'Copy', de: 'Kopieren'},
		clRefresh: {tr: 'Yenile', en: 'Refresh', de: 'Aktualisieren'},
		clCloseJoin: {tr: 'Yeni katılımı kapat', en: 'Close joining', de: 'Beitritt schließen'},
		clOpenJoin: {tr: 'Yeni katılımı aç', en: 'Open joining', de: 'Beitritt öffnen'},
		clClosed: {tr: 'Yeni katılım kapalı', en: 'Joining is closed', de: 'Beitritt geschlossen'},
		clStudent: {tr: 'Öğrenci', en: 'Student', de: 'Lernende'},
		clNoStudents: {tr: 'Henüz katılan öğrenci yok.', en: 'No student has joined yet.', de: 'Noch niemand ist beigetreten.'},
		clNoExercises: {tr: 'Bu planda alıştırma sayfası yok; tabloda gösterilecek bir şey yok.', en: 'This plan has no exercise pages; there is nothing to show in the table.', de: 'Dieser Plan hat keine Übungsseiten; die Tabelle bleibt leer.'},
		clDeleteStudent: {tr: 'Sil', en: 'Delete', de: 'Löschen'},
		clDeleteStudentQ: {tr: '{nick} ve bütün denemeleri silinsin mi?', en: 'Delete {nick} and all their attempts?', de: '{nick} und alle Versuche löschen?'},
		clDeleteClass: {tr: 'Sınıfı ve bütün verisini sil', en: 'Delete the class and all its data', de: 'Klasse und alle Daten löschen'},
		clDeleteHint: {tr: 'Silmek için sınıf kodunu yazın ({code}). Bu geri alınamaz.', en: 'Type the class code to delete ({code}). This cannot be undone.', de: 'Geben Sie zum Löschen den Klassencode ein ({code}). Das kann nicht rückgängig gemacht werden.'},
		clConfirmDelete: {tr: 'Kalıcı olarak sil', en: 'Delete for good', de: 'Endgültig löschen'},
		clAttemptsOf: {tr: '{nick} · {exercise}', en: '{nick} · {exercise}', de: '{nick} · {exercise}'},
		clNoAttempts: {tr: 'Bu alıştırmada deneme yok.', en: 'No attempts in this exercise.', de: 'Keine Versuche in dieser Übung.'},
		clBack: {tr: '← Sınıflarım', en: '← My classes', de: '← Meine Klassen'},
		clLoading: {tr: 'Yükleniyor…', en: 'Loading…', de: 'Wird geladen…'},
		clErrAuth: {tr: 'Giriş olmadı: e-posta ya da şifre yanlış, ya da bu e-postayla zaten bir hesap var.', en: 'That did not work: the e-mail or password is wrong, or an account with this e-mail already exists.', de: 'Das hat nicht geklappt: E-Mail oder Passwort ist falsch, oder es gibt schon ein Konto mit dieser E-Mail.'},
		clErrNetwork: {tr: 'Sunucuya bağlanılamadı; internet bağlantınızı kontrol edip yeniden deneyin.', en: 'Could not reach the server; check your connection and try again.', de: 'Der Server war nicht erreichbar; prüfen Sie die Verbindung und versuchen Sie es erneut.'},
		clErrDenied: {tr: 'Buna izniniz yok.', en: 'You are not allowed to do this.', de: 'Dazu fehlt die Berechtigung.'},
		clErrUnverified: {tr: 'Önce e-posta adresinizi doğrulayın.', en: 'Verify your e-mail address first.', de: 'Bestätigen Sie zuerst Ihre E-Mail-Adresse.'},
		clErrPlan: {tr: 'Geçerli bir ders planı bağlantısı yapıştırın.', en: 'Paste a valid lesson plan link.', de: 'Fügen Sie einen gültigen Planlink ein.'},
		clErrName: {tr: 'Sınıfa bir ad verin.', en: 'Give the class a name.', de: 'Geben Sie der Klasse einen Namen.'},
		teacherLink: {tr: "Ders planı hazırla (öğretmenler)", en: "Make a lesson plan (teachers)", de: "Unterrichtsplan erstellen (Lehrkräfte)"},
		planBarLabel: {tr: "Ders planı", en: "Lesson plan", de: "Unterrichtsplan"},
		planOf: {tr: "{i} / {n}", en: "{i} / {n}", de: "{i} / {n}"},
		planBack: {tr: "Plana dön", en: "Back to the plan", de: "Zurück zum Plan"},
		planFinish: {tr: "Planı bitir", en: "Finish the plan", de: "Plan beenden"},
		planNote: {tr: "Hocanızdan not:", en: "Note from your teacher:", de: "Hinweis Ihrer Lehrkraft:"},
		tpTitleLabel: {tr: "Planın adı", en: "Name of the plan", de: "Name des Plans"},
		tpTitlePh: {tr: "Ör. Veri Yapıları, 3. hafta", en: "e.g. Data Structures, week 3", de: "z. B. Datenstrukturen, Woche 3"},
		tpIntroLabel: {tr: "Öğrencilere açıklama (isteğe bağlı)", en: "Introduction for the students (optional)", de: "Einführung für die Lernenden (optional)"},
		tpIntroPh: {tr: "Bu hafta neleri işleyeceğiz, ne hazırlanmalı…", en: "What we cover this week, what to prepare…", de: "Was wir diese Woche behandeln, was vorzubereiten ist …"},
		tpCodeLabel: {tr: "Kod dili", en: "Code language", de: "Code-Sprache"},
		tpCodeStudent: {tr: "Öğrenci kendi seçsin", en: "The student chooses", de: "Die Lernenden wählen selbst"},
		tpLessonMode: {tr: "Ders modunda açılsın (sayfa bölüm bölüm ilerler)", en: "Open in lesson mode (the page goes part by part)", de: "Im Lektionsmodus öffnen (die Seite geht Teil für Teil vor)"},
		tpPresets: {tr: "Hazır planlar", en: "Ready-made plans", de: "Fertige Pläne"},
		tpPresetNote: {tr: "Birini seçince listedeki sayfalar onunla değişir; sonra istediğiniz gibi düzenleyebilirsiniz.", en: "Choosing one replaces the pages in your list; then you can change it any way you like.", de: "Wenn Sie einen wählen, ersetzt er die Seiten Ihrer Liste; danach können Sie ihn beliebig ändern."},
		tpCatalog: {tr: "Sayfalar", en: "Pages", de: "Seiten"},
		tpPlanList: {tr: "Planınız", en: "Your plan", de: "Ihr Plan"},
		tpAdd: {tr: "Ekle", en: "Add", de: "Hinzufügen"},
		tpAdded: {tr: "Eklendi", en: "Added", de: "Hinzugefügt"},
		tpUp: {tr: "Yukarı taşı", en: "Move up", de: "Nach oben"},
		tpDown: {tr: "Aşağı taşı", en: "Move down", de: "Nach unten"},
		tpRemove: {tr: "Çıkar", en: "Remove", de: "Entfernen"},
		tpNotePh: {tr: "Öğrenciye not (isteğe bağlı)", en: "Note for the students (optional)", de: "Hinweis für die Lernenden (optional)"},
		tpEmpty: {tr: "Henüz sayfa yok. Soldaki listeden \"Ekle\" ile sayfa seçin ya da bir hazır plan yükleyin.", en: "No pages yet. Pick pages with \"Add\" from the list, or load a ready-made plan.", de: "Noch keine Seiten. Wählen Sie Seiten mit „Hinzufügen“ aus der Liste oder laden Sie einen fertigen Plan."},
		tpLink: {tr: "Öğrencilerle paylaşılacak bağlantı", en: "The link to share with the students", de: "Der Link für die Lernenden"},
		tpCopy: {tr: "Bağlantıyı kopyala", en: "Copy the link", de: "Link kopieren"},
		tpCopied: {tr: "Bağlantı kopyalandı", en: "Link copied", de: "Link kopiert"},
		tpOpen: {tr: "Planı aç", en: "Open the plan", de: "Plan öffnen"},
		tpLongWarn: {tr: "Bağlantı uzun ({n} karakter); bazı mesajlaşma uygulamaları kesebilir. Notları kısaltın ya da planı ikiye bölün.", en: "The link is long ({n} characters); some messaging apps may cut it. Shorten the notes or split the plan in two.", de: "Der Link ist lang ({n} Zeichen); manche Messenger kürzen ihn. Kürzen Sie die Hinweise oder teilen Sie den Plan."},
		tpCount: {tr: "{n} sayfa", en: "{n} pages", de: "{n} Seiten"},
		tpClear: {tr: "Planı temizle", en: "Clear the plan", de: "Plan leeren"},
		tpLoaded: {tr: "Bağlantıdaki plan açıldı: düzenleyebilirsiniz.", en: "The plan from the link is open: you can edit it.", de: "Der Plan aus dem Link ist geöffnet: Sie können ihn bearbeiten."},
		ppEmptyTitle: {tr: "Ders planı bulunamadı", en: "No lesson plan found", de: "Kein Unterrichtsplan gefunden"},
		ppEmpty: {tr: "Bu bağlantıda bir ders planı yok ya da bozuk. Öğretmeninizden bağlantıyı yeniden isteyin.", en: "There is no lesson plan in this link, or it is broken. Ask your teacher for the link again.", de: "In diesem Link steckt kein Unterrichtsplan oder er ist defekt. Bitten Sie Ihre Lehrkraft erneut um den Link."},
		ppStart: {tr: "Başla", en: "Start", de: "Starten"},
		ppContinue: {tr: "Devam et", en: "Continue", de: "Weiter"},
		ppAllDone: {tr: "Planı tamamladınız!", en: "You finished the plan!", de: "Sie haben den Plan abgeschlossen!"},
		ppProgress: {tr: "{done} / {n} ders yapıldı", en: "{done} of {n} lessons done", de: "{done} von {n} Lektionen erledigt"},
		ppEdit: {tr: "Planı düzenle", en: "Edit the plan", de: "Plan bearbeiten"},
		ppShare: {tr: "Bağlantıyı kopyala", en: "Copy the link", de: "Link kopieren"},
		ppDropped: {tr: "{n} sayfa bu sürümde bulunamadı ve atlandı.", en: "{n} pages were not found in this version and were skipped.", de: "{n} Seiten wurden in dieser Version nicht gefunden und übersprungen."},
		ppDone: {tr: "Yapıldı", en: "Done", de: "Erledigt"},
		ppCodeNote: {tr: "Örnekler {lang} ile gösterilir.", en: "The examples are shown in {lang}.", de: "Die Beispiele werden in {lang} gezeigt."},
		ppLessonNote: {tr: "Sayfalar ders modunda açılır.", en: "The pages open in lesson mode.", de: "Die Seiten öffnen sich im Lektionsmodus."},
		ppRunNote: {tr: "Bir sayfayı yapılmış saymak için o sayfada bir kod bloğunu çalıştırın.", en: "A page counts as done when you run a code block on it.", de: "Eine Seite gilt als erledigt, wenn Sie dort einen Codeblock ausführen."},
		statsCompare: {tr: 'Karşılaştırma', en: 'Comparisons', de: 'Vergleiche'},
		statsWrite: {tr: 'Yazma', en: 'Writes', de: 'Schreibvorgänge'},
		stepCompareSetting: {tr: 'Adım karşılaştırma: önceki hali soluk göster', en: 'Step comparison: show the previous state faded', de: 'Schrittvergleich: vorherigen Zustand blass zeigen'},
		ghostLegend: {tr: 'soluk ve kesik: bir önceki adımdaki hal', en: 'faded and dashed: how it was before this step', de: 'blass und gestrichelt: der Zustand vor diesem Schritt'},
		warningsSetting: {tr: 'Kopan düğüm uyarısı', en: 'Lost node warnings', de: 'Warnung bei verlorenen Knoten'},
		fontSize: {tr: 'Kod yazı boyutu', en: 'Code font size', de: 'Schriftgröße im Code'},
		fontSizes: {
			tr: {normal: 'Normal', large: 'Büyük', xlarge: 'Çok büyük'},
			en: {normal: 'Normal', large: 'Large', xlarge: 'Extra large'},
			de: {normal: 'Normal', large: 'Groß', xlarge: 'Sehr groß'}
		},
		shortcuts: {
			tr: 'Kısayollar: ← → adım, boşluk oynat/duraklat, Ctrl+Enter bloğu çalıştır.',
			en: 'Shortcuts: ← → step, space play/pause, Ctrl+Enter run the block.',
			de: 'Tastenkürzel: ← → Schritt, Leertaste Abspielen/Pause, Strg+Enter Block ausführen.'
		},
		resetSettings: {tr: 'Varsayılanlara dön', en: 'Reset to defaults', de: 'Zurücksetzen'},

		// ---------------- player and editors (js/linkedlist.js) ----------------
		stepBack: {tr: 'Geri adım', en: 'Step back', de: 'Schritt zurück'},
		play: {tr: 'Oynat', en: 'Play', de: 'Abspielen'},
		replay: {tr: 'Baştan oynat', en: 'Play again from the start', de: 'Von vorn abspielen'},
		pause: {tr: 'Duraklat', en: 'Pause', de: 'Pause'},
		stepForward: {tr: 'İleri adım', en: 'Step forward', de: 'Schritt vor'},
		toEnd: {tr: 'Sona atla', en: 'Skip to the end', de: 'Zum Ende'},
		speed: {tr: 'Hız', en: 'Speed', de: 'Tempo'},
		stepCounter: {tr: 'Adım {i} / {n}', en: 'Step {i} / {n}', de: 'Schritt {i} / {n}'},
		step: {tr: 'Adım', en: 'Step', de: 'Schritt'},
		timelineTitle: {
			tr: 'Adımlar arasında gezinin. Kısayollar: ← → adım, boşluk oynat/duraklat',
			en: 'Move between the steps. Shortcuts: ← → step, space play/pause',
			de: 'Zwischen den Schritten wechseln. Tastenkürzel: ← → Schritt, Leertaste Abspielen/Pause'
		},
		narrationEmpty: {
			tr: 'Kodu çalıştırın; her adım burada açıklanır. Kısayollar: ← → adım, boşluk oynat/duraklat.',
			en: 'Run the code; every step is explained here. Shortcuts: ← → step, space play/pause.',
			de: 'Führe den Code aus; jeder Schritt wird hier erklärt. Tastenkürzel: ← → Schritt, Leertaste Abspielen/Pause.'
		},
		run: {tr: 'Çalıştır', en: 'Run', de: 'Ausführen'},
		runTitle: {tr: 'Çalıştır (Ctrl+Enter)', en: 'Run (Ctrl+Enter)', de: 'Ausführen (Strg+Enter)'},
		shareTitle: {tr: 'Kodu bağlantıyla paylaş', en: 'Share the code as a link', de: 'Den Code als Link teilen'},
		shareCopied: {tr: 'Bağlantı kopyalandı: değiştirdiğiniz bloklar bağlantının içinde.', en: 'Link copied: the blocks you changed are in the link.', de: 'Link kopiert: die geänderten Blöcke stecken im Link.'},
		shareCopiedPage: {tr: 'Sayfanın bağlantısı kopyalandı (değiştirilmiş blok yok).', en: 'Link to the page copied (no block was changed).', de: 'Link zur Seite kopiert (kein Block wurde geändert).'},
		shareManual: {tr: 'Bağlantıyı kopyalayın:', en: 'Copy the link:', de: 'Kopieren Sie den Link:'},
		sharedBanner: {tr: 'Bu sayfa paylaşılan bir bağlantıyla açıldı: {n} blokta paylaşılan kod var. Kodu okuyun, çalıştırmak için Çalıştır\'a basın.', en: 'This page was opened from a shared link: {n} block(s) hold shared code. Read the code, then press Run to run it.', de: 'Diese Seite wurde über einen geteilten Link geöffnet: {n} Block/Blöcke enthalten geteilten Code. Lesen Sie den Code und drücken Sie dann Ausführen.'},
		sharedRestore: {tr: 'Sayfanın kendi koduna dön', en: 'Back to the page\'s own code', de: 'Zurück zum Code der Seite'},
		restore: {tr: '↺ Geri yükle', en: '↺ Restore', de: '↺ Wiederherstellen'},
		restoreTitle: {tr: 'Örneğin kendi kodunu geri yükle', en: 'Put the example\'s own code back', de: 'Den ursprünglichen Code des Beispiels wiederherstellen'},
		unreachable: {tr: 'ulaşılamıyor', en: 'unreachable', de: 'unerreichbar'},
		moreCalls: {tr: '… {n} çağrı daha', en: '… {n} more calls', de: '… {n} weitere Aufrufe'},
		nodeValue: {tr: 'düğüm({data})', en: 'node({data})', de: 'Knoten({data})'},
		undefinedValue: {tr: 'tanımsız', en: 'undefined', de: 'undefiniert'},

		// ---------------- narration ----------------
		nCalled: {tr: '`{call}` çağrıldı.', en: '`{call}` was called.', de: '`{call}` wurde aufgerufen.'},
		nFinished: {tr: '`{call}` bitti.', en: '`{call}` finished.', de: '`{call}` ist fertig.'},
		nReturned: {tr: '`{call}` döndürdü: {value}.', en: '`{call}` returned {value}.', de: '`{call}` gab {value} zurück.'},
		noteFinished: {tr: '{call} bitti.', en: '{call} finished.', de: '{call} ist fertig.'},
		noteReturned: {tr: '{call} döndürdü: {value}', en: '{call} returned {value}', de: '{call} gab {value} zurück'},
		nLostOne: {
			tr: '{nodes} düğümüne artık hiçbir değişkenden ya da bağdan ulaşılamıyor.',
			en: 'No variable and no link reaches {nodes} any more.',
			de: '{nodes} ist von keiner Variable und keinem Link mehr erreichbar.'
		},
		nLostMany: {
			tr: '{nodes} düğümlerine artık hiçbir değişkenden ya da bağdan ulaşılamıyor.',
			en: 'No variable and no link reaches {nodes} any more.',
			de: '{nodes} sind von keiner Variable und keinem Link mehr erreichbar.'
		},
		nLostOneJava: {tr: '{nodes} düğümüne artık ulaşılamıyor; Java\'nın çöp toplayıcısı onu silecek.', en: 'Nothing reaches {nodes} any more; Java\'s garbage collector will remove it.', de: '{nodes} ist nicht mehr erreichbar; der Garbage Collector von Java wird ihn entfernen.'},
		nLostManyJava: {tr: '{nodes} düğümlerine artık ulaşılamıyor; Java\'nın çöp toplayıcısı onları silecek.', en: 'Nothing reaches {nodes} any more; Java\'s garbage collector will remove them.', de: '{nodes} sind nicht mehr erreichbar; der Garbage Collector von Java wird sie entfernen.'},
		unreachableJava: {tr: 'çöp', en: 'garbage', de: 'Müll'},
		javaNoDelete: {tr: 'Java\'da gerekmez, çöp toplayıcı ulaşılamayan düğümü siler', en: 'not needed in Java, the garbage collector removes nodes nothing reaches', de: 'in Java nicht nötig, der Garbage Collector entfernt unerreichbare Knoten'},
		nPointsNull: {tr: '{name} artık `null`: hiçbir düğümü göstermiyor.', en: '{name} is now `null`: it points to no node.', de: '{name} ist jetzt `null`: zeigt auf keinen Knoten.'},
		nPointsTo: {tr: '{name} artık {node} düğümünü gösteriyor.', en: '{name} now points to {node}.', de: '{name} zeigt jetzt auf {node}.'},
		nNewNode: {tr: '{name} adında yeni bir düğüm oluşturuldu: {node}.', en: 'A new node {node} was created as {name}.', de: 'Ein neuer Knoten {node} wurde als {name} erstellt.'},
		nNewNodeNext: {tr: '{name} adında yeni bir düğüm oluşturuldu: {node}; next\'i {next} düğümünü gösteriyor.', en: 'A new node {node} was created as {name}; its next points to {next}.', de: 'Ein neuer Knoten {node} wurde als {name} erstellt; sein next zeigt auf {next}.'},
		nValue: {tr: '{name} = {value}.', en: '{name} = {value}.', de: '{name} = {value}.'},
		nNewArray: {tr: '{name} adında {n} hücreli bir dizi oluşturuldu; hücrelerin hepsi `null`.', en: 'An array of {n} cells was created as {name}; all cells are `null`.', de: 'Ein Array mit {n} Zellen wurde als {name} erstellt; alle Zellen sind `null`.'},
		nNewMatrix: {tr: '{name} adında {r} satır, {c} sütunluk bir matris oluşturuldu; hücrelerin hepsi `null`.', en: 'A matrix of {r} rows and {c} columns was created as {name}; all cells are `null`.', de: 'Eine Matrix mit {r} Zeilen und {c} Spalten wurde als {name} erstellt; alle Zellen sind `null`.'},
		nCellNode: {tr: '{cell} artık {node} düğümünü gösteriyor.', en: '{cell} now points to {node}.', de: '{cell} zeigt jetzt auf {node}.'},
		nCellNull: {tr: '{cell} artık `null`.', en: '{cell} is now `null`.', de: '{cell} ist jetzt `null`.'},
		nCellNew: {tr: '{cell} yeni bir düğümü gösteriyor: {node}.', en: '{cell} points to a new node: {node}.', de: '{cell} zeigt auf einen neuen Knoten: {node}.'},
		nCellValue: {tr: '{cell} = {value}.', en: '{cell} = {value}.', de: '{cell} = {value}.'},
		arrayValue: {tr: 'dizi({n})', en: 'array({n})', de: 'Array({n})'},
		rowValue: {tr: 'matrisin bir satırı ({n} hücre)', en: 'a row of the matrix ({n} cells)', de: 'eine Zeile der Matrix ({n} Zellen)'},
		nField: {tr: '{node} düğümünün {field} alanı {value} oldu.', en: 'The {field} of {node} is now {value}.', de: 'Das Feld {field} von {node} ist jetzt {value}.'},
		nData: {tr: '{node} düğümünün değeri {value} oldu.', en: 'The value of {node} is now {value}.', de: 'Der Wert von {node} ist jetzt {value}.'},
		nLinkNew: {
			tr: 'Yeni bir düğüm {new} oluşturuldu ve {node} düğümünün {field} bağı ona bağlandı.',
			en: 'A new node {new} was created and {field} of {node} now points to it.',
			de: 'Ein neuer Knoten {new} wurde erstellt und {field} von {node} zeigt jetzt darauf.'
		},
		nLinkNull: {tr: '{node} düğümünün {field} bağı artık `null`.', en: '{field} of {node} is now `null`.', de: '{field} von {node} ist jetzt `null`.'},
		nLink: {tr: '{node} düğümünün {field} bağı artık {target} düğümünü gösteriyor.', en: '{field} of {node} now points to {target}.', de: '{field} von {node} zeigt jetzt auf {target}.'},
		nIfTrue: {tr: 'Koşul `{c}` doğru: if bloğu çalışacak.', en: 'Condition `{c}` is true: the if block runs.', de: 'Bedingung `{c}` ist wahr: der if-Block wird ausgeführt.'},
		nIfElse: {tr: 'Koşul `{c}` yanlış: else bloğu çalışacak.', en: 'Condition `{c}` is false: the else block runs.', de: 'Bedingung `{c}` ist falsch: der else-Block wird ausgeführt.'},
		nIfSkip: {tr: 'Koşul `{c}` yanlış: if bloğu atlanıyor.', en: 'Condition `{c}` is false: the if block is skipped.', de: 'Bedingung `{c}` ist falsch: der if-Block wird übersprungen.'},
		nLoopTrue: {tr: 'Koşul `{c}` doğru: döngü bir tur daha dönüyor.', en: 'Condition `{c}` is true: the loop runs once more.', de: 'Bedingung `{c}` ist wahr: die Schleife läuft noch einmal.'},
		nLoopFalse: {tr: 'Koşul `{c}` yanlış: döngü bitti.', en: 'Condition `{c}` is false: the loop ends.', de: 'Bedingung `{c}` ist falsch: die Schleife endet.'},
		nCondTrue: {tr: 'Koşul `{c}` doğru.', en: 'Condition `{c}` is true.', de: 'Bedingung `{c}` ist wahr.'},
		nCondFalse: {tr: 'Koşul `{c}` yanlış.', en: 'Condition `{c}` is false.', de: 'Bedingung `{c}` ist falsch.'},
		nPrint: {tr: 'Çıktıya yazıldı: {value}', en: 'Printed: {value}', de: 'Ausgegeben: {value}'},
		nFreed: {tr: '{node} düğümü silindi.', en: '{node} was deleted.', de: '{node} wurde gelöscht.'},
		nExpr: {tr: '`{code}` çalıştı.', en: '`{code}` ran.', de: '`{code}` wurde ausgeführt.'},
		nExprValue: {tr: '`{code}` çalıştı, sonuç: {value}.', en: '`{code}` ran, result: {value}.', de: '`{code}` wurde ausgeführt, Ergebnis: {value}.'},
		nBreak: {tr: 'break: döngüden çıkılıyor.', en: 'break: leaving the loop.', de: 'break: die Schleife wird verlassen.'},
		nContinue: {tr: 'continue: döngünün bir sonraki turuna geçiliyor.', en: 'continue: on to the next round of the loop.', de: 'continue: weiter mit der nächsten Runde der Schleife.'},

		// ---------------- errors ----------------
		eLine: {tr: 'Satır {n}: ', en: 'Line {n}: ', de: 'Zeile {n}: '},
		eInBlock: {tr: 'Blok {n} çalıştırılırken: ', en: 'While running block {n}: ', de: 'Beim Ausführen von Block {n}: '},
		eEngineName: {
			tr: '"{name}" adı uygulamanın kendisi tarafından kullanılıyor, başka bir isim seçin.',
			en: 'The name "{name}" is used by the app itself, choose another name.',
			de: 'Der Name "{name}" wird von der App selbst verwendet; wählen Sie einen anderen Namen.'
		},
		eReserved: {
			tr: '"{name}" adı tarayıcıya ayrılmış, değişken olarak kullanılamaz. Başka bir isim seçin{hint}',
			en: 'The name "{name}" belongs to the browser and cannot be a variable. Choose another name{hint}',
			de: 'Der Name "{name}" gehört dem Browser und kann keine Variable sein. Wähle einen anderen Namen{hint}'
		},
		eReservedTop: {tr: ' (ör. tepe).', en: ' (e.g. topNode).', de: ' (z. B. topNode).'},
		eLoop: {
			tr: 'döngü 1000 kereden fazla döndü. Sonsuz bir döngü olabilir mi? Döngü koşulunun bir gün yanlış olacağından emin olun.',
			en: 'the loop ran more than 1000 times. Is it an endless loop? Make sure the loop condition becomes false at some point.',
			de: 'die Schleife lief mehr als 1000 Mal. Ist es eine Endlosschleife? Stelle sicher, dass die Schleifenbedingung irgendwann falsch wird.'
		},
		eDepth: {
			tr: 'iç içe {max} fonksiyon çağrısı aşıldı. Özyinelemenin bir durma koşulu var mı? (ör. `if(p == null) return 0`)',
			en: 'more than {max} nested function calls. Does the recursion have a stop condition? (e.g. `if(p == null) return 0`)',
			de: 'mehr als {max} verschachtelte Funktionsaufrufe. Hat die Rekursion eine Abbruchbedingung? (z. B. `if(p == null) return 0`)'
		},
		eLoopOnly: {tr: '`{kw}` yalnızca bir döngünün (`while` ya da `for`) içinde kullanılabilir.', en: '`{kw}` can only be used inside a loop (`while` or `for`).', de: '`{kw}` kann nur innerhalb einer Schleife (`while` oder `for`) verwendet werden.'},
		eReturnOnly: {tr: '`return` yalnızca bir fonksiyonun içinde kullanılabilir.', en: '`return` can only be used inside a function.', de: '`return` kann nur innerhalb einer Funktion verwendet werden.'},
		eStack: {tr: 'Çok fazla iç içe fonksiyon çağrısı. Özyinelemenin bir durma koşulu var mı?', en: 'Too many nested function calls. Does the recursion have a stop condition?', de: 'Zu viele verschachtelte Funktionsaufrufe. Hat die Rekursion eine Abbruchbedingung?'},
		eSyntax: {
			tr: 'Yazım hatası (satır {line}, sütun {col}): burada {found} beklenmiyordu.',
			en: 'Syntax error (line {line}, column {col}): {found} was not expected here.',
			de: 'Syntaxfehler (Zeile {line}, Spalte {col}): {found} wurde hier nicht erwartet.'
		},
		eEndOfCode: {tr: 'kodun sonu', en: 'the end of the code', de: 'das Ende des Codes'},
		eEndOfLine: {tr: 'satır sonu', en: 'the end of the line', de: 'das Zeilenende'},
		eNullRead: {
			tr: '`null` olan bir pointer\'ın `.{field}` alanı okunmaya çalışıldı. Pointer listenin sonunu geçmiş olabilir; döngü koşulunu kontrol edin (ör. `p != null` ya da kısaca `p`).',
			en: 'the field `.{field}` of a `null` pointer was read. The pointer may have gone past the end of the list; check the loop condition (e.g. `p != null`, or just `p`).',
			de: 'das Feld `.{field}` eines Zeigers, der `null` ist, wurde gelesen. Der Zeiger ist vielleicht über das Ende der Liste hinaus gelaufen; prüfen Sie die Schleifenbedingung (z. B. `p != null` oder kurz `p`).'
		},
		eNullWrite: {
			tr: '`null` olan bir pointer\'ın `.{field}` alanı değiştirilmeye çalışıldı. Pointer bir düğümü göstermiyor.',
			en: 'the field `.{field}` of a `null` pointer was changed. The pointer points to no node.',
			de: 'das Feld `.{field}` eines Zeigers, der `null` ist, wurde geändert. Der Zeiger zeigt auf keinen Knoten.'
		},
		eUndefined: {
			tr: '"{name}" tanımlı değil. Önce tanımlayın (ör. `var {name} = ...`).',
			en: '"{name}" is not defined. Define it first (e.g. `var {name} = ...`).',
			de: '"{name}" ist nicht definiert. Definieren Sie es zuerst (z. B. `var {name} = ...`).'
		},
		eNotFunction: {
			tr: '"{name}" bir fonksiyon değil. Fonksiyonu çağırmadan önce tanımlayın.',
			en: '"{name}" is not a function. Define the function before calling it.',
			de: '"{name}" ist keine Funktion. Definieren Sie die Funktion, bevor Sie sie aufrufen.'
		},
		eNodeNext: {tr: 'Yeni düğümün ikinci değeri (`new Node(1, x)` içindeki `x`) onun `.next` bağı olur; bir düğüm ya da `null` olmalı ({value} verildi).', en: 'The second value of a new node (the `x` in `new Node(1, x)`) becomes its `.next`; it must be a node or `null` (got {value}).', de: 'Der zweite Wert eines neuen Knotens (das `x` in `new Node(1, x)`) wird sein `.next`; er muss ein Knoten oder `null` sein ({value} angegeben).'},
		eNestedFunction: {tr: '"{name}" bir fonksiyonun içinde tanımlanmış; Düğüm\'de fonksiyonlar yalnızca en dışta tanımlanır. Fonksiyonu dışarı taşıyın, gereken değerleri parametre olarak verin.', en: '"{name}" is defined inside a function; in Düğüm functions are defined at the top level only. Move the function out and pass the values it needs as parameters.', de: '"{name}" ist innerhalb einer Funktion definiert; in Düğüm werden Funktionen nur auf oberster Ebene definiert. Verschieben Sie die Funktion nach außen und übergeben Sie die nötigen Werte als Parameter.'},
		eDivZero: {tr: 'Sıfıra bölme: bir tam sayı sıfıra bölünemez.', en: 'Division by zero: an integer cannot be divided by zero.', de: 'Division durch null: eine ganze Zahl kann nicht durch null geteilt werden.'},
		eCallField: {tr: 'Bir çağrının sonucunun alanına doğrudan yazılamaz (`{call}{dot}{field} = …`). Önce sonucu bir değişkene alın, sonra alanına yazın: `var p = {call}`, ardından `p{dot}{field} = …`', en: 'A field of a call\'s result cannot be written directly (`{call}{dot}{field} = …`). Put the result in a variable first, then write its field: `var p = {call}`, then `p{dot}{field} = …`', de: 'Ein Feld eines Aufrufergebnisses kann nicht direkt beschrieben werden (`{call}{dot}{field} = …`). Speichern Sie das Ergebnis zuerst in einer Variable und schreiben Sie dann ihr Feld: `var p = {call}`, danach `p{dot}{field} = …`'},
		eArraySize: {tr: 'Dizi boyutu 1 ile 50 arasında bir tam sayı olmalı ({n} verildi).', en: 'The size of an array must be a whole number from 1 to 50 (got {n}).', de: 'Die Größe eines Arrays muss eine ganze Zahl von 1 bis 50 sein ({n} angegeben).'},
		eMatrixSize: {tr: 'Matris boyutu: satır ve sütun sayısı 1 ile 12 arasında tam sayı olmalı ({r} × {c} verildi).', en: 'The size of a matrix: rows and columns must be whole numbers from 1 to 12 (got {r} × {c}).', de: 'Die Größe einer Matrix: Zeilen und Spalten müssen ganze Zahlen von 1 bis 12 sein ({r} × {c} angegeben).'},
		eMatrixRow: {tr: '{name}[{i}]: matrisin {n} satırı var, geçerli satır indisleri 0 ile {last} arası.', en: '{name}[{i}]: the matrix has {n} rows, valid row indexes are 0 to {last}.', de: '{name}[{i}]: die Matrix hat {n} Zeilen, gültige Zeilenindizes sind 0 bis {last}.'},
		eMatrixCol: {tr: '{name}[{i}][{j}]: matrisin {n} sütunu var, geçerli sütun indisleri 0 ile {last} arası.', en: '{name}[{i}][{j}]: the matrix has {n} columns, valid column indexes are 0 to {last}.', de: '{name}[{i}][{j}]: die Matrix hat {n} Spalten, gültige Spaltenindizes sind 0 bis {last}.'},
		eNotMatrix: {tr: '"{name}" bir matris değil; önce matris olarak oluşturun (ör. `var g = new Array(3, 4)`).', en: '"{name}" is not a matrix; create it as a matrix first (e.g. `var g = new Array(3, 4)`).', de: '"{name}" ist keine Matrix; erstellen Sie sie zuerst als Matrix (z. B. `var g = new Array(3, 4)`).'},
		eMatrixOneIndex: {tr: '"{name}" bir matris: iki indis gerekir, ör. `{name}[i][j] = ...`.', en: '"{name}" is a matrix: it takes two indexes, e.g. `{name}[i][j] = ...`.', de: '"{name}" ist eine Matrix: sie braucht zwei Indizes, z. B. `{name}[i][j] = ...`.'},
		eIndex: {tr: '{name}[{i}]: dizinin {n} hücresi var, geçerli indisler 0 ile {last} arası.', en: '{name}[{i}]: the array has {n} cells, valid indexes are 0 to {last}.', de: '{name}[{i}]: das Array hat {n} Zellen, gültige Indizes sind 0 bis {last}.'},
		eNotArray: {tr: '"{name}" bir dizi değil; önce dizi olarak oluşturun (ör. `var t = new Array(n)`).', en: '"{name}" is not an array; create it as an array first (e.g. `var t = new Array(n)`).', de: '"{name}" ist kein Array; erstellen Sie es zuerst als Array (z. B. `var t = new Array(n)`).'},
		eGeneric: {tr: 'Hata: {msg}', en: 'Error: {msg}', de: 'Fehler: {msg}'}
	};

	function load(){
		var saved = {};
		try { saved = JSON.parse(localStorage.getItem('dsv-settings') || '{}') || {}; } catch(e) {}
		try { // the theme used to be stored on its own
			var oldTheme = localStorage.getItem('dsv-theme');
			if(oldTheme && !saved.theme) saved.theme = oldTheme;
		} catch(e) {}
		var s = {};
		for(var k in DEFAULTS) s[k] = saved[k] !== undefined ? saved[k] : DEFAULTS[k];
		if(LANGS.indexOf(s.lang) < 0) s.lang = browserLanguage();
		return s;
	}

	function browserLanguage(){
		var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
		for(var i = 0; i < list.length; i++){
			var code = String(list[i]).slice(0, 2).toLowerCase();
			if(code === 'tr' || code === 'de' || code === 'en') return code;
		}
		return 'en';
	}

	var settings = load();

	function save(){
		try { localStorage.setItem('dsv-settings', JSON.stringify(settings)); } catch(e) {}
	}

	function t(key, vars){
		var entry = TEXT[key];
		if(!entry) return key;
		var text = entry[settings.lang] !== undefined ? entry[settings.lang] : entry.tr;
		if(typeof text === 'string' && vars)
			text = text.replace(/\{(\w+)\}/g, function(m, name){ return vars[name] !== undefined ? vars[name] : m; });
		return text;
	}

	function applyTheme(){
		var theme = settings.theme;
		if(theme !== 'light' && theme !== 'dark')
			theme = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
	}

	function applyAll(){
		document.documentElement.setAttribute('lang', settings.lang);
		document.documentElement.setAttribute('data-font', settings.fontSize);
		applyTheme();
	}

	applyAll();

	window.dsv = {
		LANGS: LANGS,
		LANG_NAMES: {tr: 'Türkçe', en: 'English', de: 'Deutsch'},
		TEXT: TEXT,
		settings: settings,
		t: t,
		// change one setting, store it and apply what can be applied at once
		set: function(key, value){
			settings[key] = value;
			save();
			applyAll();
			if(window.dsvApplySettings) window.dsvApplySettings(key);
		},
		reset: function(){
			var lang = settings.lang;
			for(var k in DEFAULTS) settings[k] = DEFAULTS[k];
			settings.lang = lang; // the language stays
			save();
			applyAll();
			if(window.dsvApplySettings) window.dsvApplySettings('all');
		}
	};
})();

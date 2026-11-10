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
		nCellNode: {tr: '{cell} artık {node} düğümünü gösteriyor.', en: '{cell} now points to {node}.', de: '{cell} zeigt jetzt auf {node}.'},
		nCellNull: {tr: '{cell} artık `null`.', en: '{cell} is now `null`.', de: '{cell} ist jetzt `null`.'},
		nCellNew: {tr: '{cell} yeni bir düğümü gösteriyor: {node}.', en: '{cell} points to a new node: {node}.', de: '{cell} zeigt auf einen neuen Knoten: {node}.'},
		nCellValue: {tr: '{cell} = {value}.', en: '{cell} = {value}.', de: '{cell} = {value}.'},
		arrayValue: {tr: 'dizi({n})', en: 'array({n})', de: 'Array({n})'},
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

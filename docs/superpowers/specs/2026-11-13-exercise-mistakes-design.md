# Alıştırmalar: öğrenci kendi hatasını görsün (karşılaştırma çizimi ve deneme geçmişi)

## Amaç ve neden

Öğretmenin öğrenci sonuçlarını görmesi de istendi, ama **daha önemlisi öğrencinin kendi hatasını görmesi**. Bugün başarısız bir kontrolde öğrenci yalnızca bir yazı görüyor: `beklenen "4>3>2>1", senin sonucun "1>2>3>4"`. Site bir görselleştirme aracı; hatayı da çizerek göstermeli. Öğrenci ayrıca önceki denemelerine dönüp neyi değiştirdiğini, nerede takıldığını görebilmeli.

Bu iş sunucusuz yapılır: her şey öğrencinin tarayıcısında. Öğretmen tarafı (veritabanı) sonraki bir iş; buradaki kayıt biçimi ona taşınabilecek şekilde seçildi.

## Kapsam

- **A. Karşılaştırma çizimi:** başarısız bir kontrolde her tutmayan beklenti için "Beklenen" ve "Senin sonucun" yan yana (dar ekranda alt alta) çizilir; farklı olan düğümler/hücreler işaretlenir.
- **B. Deneme geçmişi:** her kontrol (geçen, kalan, kod hatası veren) tarayıcıda kaydedilir; öğrenci "Önceki denemelerim" listesinden eski kodunu, sonucunu ve karşılaştırma çizimini görür, eski kodu editöre geri yükleyebilir.

## Hedefler

- Öğrenci, yanlış sonucunun beklenenden **nerede** ayrıldığını tek bakışta görür (hangi düğüm, hangi hücre, eksik mi fazla mı).
- Öğrenci, bir önceki denemesine dönüp kodunu geri alabilir; aynı hatayı tekrarladığını görebilir.
- Dört kod dilinde (Düğüm, Türkçe, C++, Java) ve tr/en/de arayüzde çalışır.

## Hedef olmayanlar

- Öğretmenin sonuçları görmesi, veritabanı, cihazlar arası eşitleme (sonraki iş).
- Hata türlerinin sınıflandırılması ve "Hatalarım" özeti (C seçeneği, sonraya).
- Gizli test kodunu ya da gizli girdileri gösterme.

## Olmaması gerekenler (iş görse bile başarısızlık sayılır)

- Gizli test kodunun, gizli girdilerin (`build(4)` gibi) ya da çözümün sızması. Gösterilen yalnızca beklentinin etiketi, beklenen değer ve öğrencinin değeri (bugünkü yazıdaki kadar).
- Siteden dışarıya istek gitmesi (`tests/pages.spec.js` bunu yasaklıyor; geçmiş yalnızca `localStorage`'da).
- Kişisel veri tutulması (ad, e-posta yok).
- Mevcut alıştırma akışının (Kontrol et, ipucu, çözüm, ilerleme, ders planı) bozulması ya da kontrolün belirgin yavaşlaması.

## Kısıtlar

- Statik site, sunucu yok; `localStorage` kapalı ya da dolu olabilir: geçmiş o zaman yalnızca sayfa açıkken (bellekte) tutulur, sayfa bozulmaz.
- `js/exercise.js` tarayıcı JavaScript'i, mevcut dosyanın ES5 üslubunda; motor (`js/linkedlist.js`) değişmez ya da çok az değişir.
- Telefon genişliğinde (390 px) okunur kalmalı.
- Metinler `js/i18n.js` anahtarları (tr/en/de).

## Yaklaşımlar

**A için (çizim):**
1. **HTML/CSS kutular (seçilen).** Beklenen ve gerçek değer, sayfadaki düğüm/hücre görünümünü taklit eden küçük HTML kutularıyla çizilir. Hafif, tema renklerini (`--viz-*`) kullanır, metin olarak okunabilir (ekran okuyucu), testle doğrulanması kolay, öğrencinin kendi çizimine (paper.js tuvali) dokunmaz.
2. Motorun çizimini ikinci bir tuvalde yeniden kullanmak: sayfadaki çizimle birebir aynı görünür, ama motoru değerden (programdan değil) çizmeye zorlamak gerekir; büyük ve kırılgan bir değişiklik.
3. Yalnızca metinde farkı işaretlemek (`1>2>[3]>4`): en ucuzu, ama "görerek anlama" hedefini karşılamaz.

**B için (saklama):** yalnızca tarayıcıda (seçilen); veritabanı sonraki işte. Kayıt biçimi veritabanına olduğu gibi gidebilecek düz JSON.

## Tasarım: A. Karşılaştırma çizimi

- **Nerede:** başarısız kontrolün sonuç kutusunda (`.ex-result.bad`), her tutmayan beklentinin yazısının hemen altında. Bugünkü yazı satırı kalır (erişilebilirlik ve kısa özet), çizim onun altına eklenir.
- **Şekil, beklentiden çıkarılır** (sayfalarda değişiklik gerekmez):
  - İfade `walk(` ya da `back(` ile başlıyorsa **liste**: değer `"4>3>2>1"` biçimindeki metin düğümlere bölünür; boş metin "boş liste" olarak çizilir.
  - Beklenen değer dizilerden oluşan bir diziyse **ızgara** (matris).
  - Beklenen değer bir diziyse **dizi** (hücre satırı).
  - Aksi halde **tek değer** kutusu (sayı, `true`/`false`, `null`).
  - Öğrencinin değeri beklenenin şekline uymuyorsa (ör. liste yerine sayı) ikisi de tek değer kutusu olarak, ayrı ayrı çizilir. Liste beklentilerinde `walk()` düğüm olmayan bir değeri bugün metne çeviriyor (`5` → `"5"`); geçme/kalma kararı **bugünkü gibi kalır**, yalnızca çizim için `walk()`'a gelen değerin düğüm olup olmadığı ayrıca not edilir ve düğüm değilse çizim tek değer kutusu olur.
  - Öğrencinin ifadesi hata verdiyse (çizilecek değer yok) çizim yapılmaz, hata yazısı kalır.
- **Fark işaretleri** (konuma göre):
  - Aynı konumda farklı değer: iki tarafta da turuncu çerçeve (sayfadaki "bu adımda değişen" rengi).
  - Öğrencide fazladan eleman: kırmızımsı, "fazla" olarak.
  - Öğrencide eksik eleman: beklenen tarafta işaretli, öğrenci tarafında kesik çizgili boş yer.
  - Izgarada hücre hücre aynı kural; boyut farklıysa fazla/eksik satır ve sütunlar aynı şekilde.
- **Sınırlar:** 50 düğüm/hücreden uzun listeler/diziler ve 12×12'den büyük ızgaralar çizilmez, yalnızca yazı kalır.
- **Görünüm:** kutular `--viz-node`, `--viz-stroke`, `--viz-changed` gibi mevcut tema değişkenleriyle; koyu temada da okunur. Başlıklar "Beklenen" / "Senin sonucun" (tr/en/de). Dar ekranda iki çizim alt alta, geniş ekranda yan yana; uzun listeler yatay kaydırılır, sayfa taşmaz.

```
Dört düğümlü listeyi ters çevirince: beklenen "4>3>2>1", senin sonucun "1>2>3>4"
  Beklenen       [4]→[3]→[2]→[1]
  Senin sonucun  [1]→[2]→[3]→[4]     (dört düğüm de turuncu)
```

## Tasarım: B. Deneme geçmişi

- **Ne kaydedilir:** her **Kontrol et** basışı, sonucu ne olursa olsun:
  - geçti (`pass`), kaldı (`fail`), ya da öğrencinin kodu çalışmadı (`error`). Hata kaydı deneme sayısını artırmaz (bugünkü kural), ama geçmişte görünür: öğrencinin en sık gördüğü "kendi hatası" bu.
- **Kayıt biçimi** (`localStorage['dsv-attempts']`, `dsv-exercises`'ten ayrı):
  `{ "<dosya>": [ {"t": "<ISO zaman>", "lang": "dugum|turkce|cpp|java", "code": "<öğrenci bloğunun metni, gösterildiği dilde>", "kind": "pass|fail|error", "error": "<açıklanan hata metni ya da null>", "results": [{"i": <beklentinin sırası>, "label": "...", "expected": <JSON>, "actual": <JSON ya da null>, "shape": "list|grid|array|value"}]} ] }`
  - `i`, beklentinin `expect` içindeki sırasıdır: geçmiş gösterilirken etiket o anki arayüz dilinde yeniden alınır (öğrenci dil değiştirse de geçmiş karışık dilde görünmez); `label` yalnızca sayfa değişirse diye yedektir.
  - `results` yalnızca tutmayan beklentileri içerir; gizli test kodu ya da ifadesi kaydedilmez, yalnızca etiket ve değerler.
  - En yeni başta; alıştırma başına en çok **10** kayıt (eskisi düşer); kod en çok 5000 karakter (fazlası kesilir).
  - Depolama kapalıysa bellekte tutulur (bugünkü ilerleme kaydı gibi); bozuk JSON görmezden gelinir.
- **Arayüz:** alıştırma panelinin altında katlanır bir "Önceki denemelerim (n)" bölümü (yalnızca en az bir kayıt varsa):
  - Her satır: saat, ✓ / ✗ / ⚠ simgesi, ilk sorunun kısa yazısı ("Dört düğümlü listeyi ters çevirince" ya da hatanın ilk satırı).
  - Satır açılınca: kodun salt okunur hâli, başarısız beklentilerin karşılaştırma çizimi (A'daki gibi, kayıttan), hata kaydıysa hata metni.
  - **"Bu kodu editöre yükle"** düğmesi: kayıt şu anki kod diliyle aynıysa görünür; editörün içeriğini değiştirir (CodeMirror'ın geri alma geçmişine girer, Ctrl+Z ile dönülür). Kod dili farklıysa düğme yerine kısa bir not.
  - **"Geçmişi temizle"**: bu alıştırmanın kayıtlarını siler (ilerleme kaydına, ✓'ye dokunmaz).

## Kararlaştırılanlar ve kimin kararı

- A + B, sunucusuz; öğretmen tarafı ve veritabanı sonraya: **kullanıcının kararı**.
- HTML/CSS ile çizim, şeklin beklentiden çıkarılması, 10 kayıt sınırı, hata kayıtlarının da geçmişe girmesi, `dsv-attempts` anahtarı: **benim önerim** (kullanıcı onayına sunulur).
- Etiketin kayıtta sırasıyla (`i`) tutulup gösterilirken o anki dilde alınması; liste beklentisinde düğüm olmayan değerin çizimde tek değer kutusu olması, geçme/kalmanın değişmemesi: **benim kararım** (yapıcı incelemesinden sonra).

## Yapıcıya kalanlar

- Kutuların ve işaretlerin tam CSS'i, simgeler, saatin biçimi.
- Metinlerin tam sözcükleri (tr/en/de).
- Kodun içinde hangi fonksiyonlara bölüneceği (ör. ayrı bir `js/exercise-compare.js` ya da `exercise.js` içinde).

## Testler (beklenen)

- Liste, dizi, ızgara ve tek değer için: başarısız bir kontrolde çizim çıkar, farklı konumlar işaretlenir, fazla/eksik doğru gösterilir; şekil uyuşmazlığında tek değer kutuları.
- Gizli girdiler ya da gizli test kodu ne yazıda ne çizimde ne geçmişte görünür.
- Geçmiş: geçen/kalan/hata kayıtları sırayla görünür; 10 sınırı; yenilemeden sonra kalır; "editöre yükle" kodu geri getirir; farklı kod dilinde düğme yerine not; "Geçmişi temizle" ilerlemeye dokunmaz; depolama kapalıyken sayfa bozulmaz.
- Telefon genişliğinde ekran görüntüsüyle kontrol.

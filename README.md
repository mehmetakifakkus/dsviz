# Bağlı Liste Görselleştirme (Linked List Visualisation)

<img float="left" src="https://mehmetakifakkus.github.io/dsviz/css/images/main.png" width="800"/>

Bağlı listelerin (linked list) nasıl çalıştığını, yazdığınız kodu adım adım çizerek gösteren bir eğitim aracı. Kurulum gerektirmez, tarayıcıda çalışır.

[Uygulamayı açın](https://mehmetakifakkus.github.io/dsviz/)

## Neler var?

- Kodlar bu iş için geliştirilmiş, JavaScript'e benzeyen **Düğüm** dilinde yazılır; dilin rehberi sitede ayrı bir sayfadadır (`language.html`, menüde "Başlarken").
- Öğretmenler için ders planı (`teacher.html`): sayfaları seçip sıralayın, her sayfaya not yazın, kod dilini ve ders modunu belirleyin; çıkan tek bağlantı öğrencilere planı verir (`plan.html`). Plan bağlantının içindedir, sunucu ya da kayıt yoktur; öğrencinin yaptıkları kendi tarayıcısında işaretlenir. Sayfalarda plan çubuğu ve öğretmenin notu görünür.
- Graflar: komşuluk listesi, BFS, DFS, Dijkstra, Bellman-Ford, topolojik sıralama, bağlı bileşenler, birleşik küme, Kruskal ve Prim; graf, komşuluk listesinden kendiliğinden çizilir (bileşenler renkli, ağaç kenarları kalın, birleşik küme orman olarak).
- Dizilerde arama ve sıralama (ikili arama, seçmeli, kabarcık, eklemeli, hızlı, heap ve sayarak sıralama): dizi çubuk olarak da çizilir, karşılaştırılan hücreler çerçevelenir, oynatıcının yanında karşılaştırma ve yazma sayacı çalışır.
- 2B diziler ve dinamik programlama: `new Array(3, 4)` ile matris, `g[i][j]` ile okuma ve yazma; tuvalde satır ve sütun numaralı bir ızgara çizilir (okunan hücreler çerçeveli, yazılan hücre turuncu, eski değer üstü çizili, indis değişkenleri satır ve sütun kenarında işaretli). Altı sayfa: matris gezme, Pascal üçgeni, ızgarada yol sayısı, en uzun ortak altdizi (LCS), sırt çantası ve N vezir (geri izleme).
- Alıştırma modu: `ex*.html` sayfalarında öğrenci görevi okur, kodu yazar ve **Kontrol et**'e basar; gizli bir test kodu ve beklenen değerler sonucu denetler (öğrencinin çizimi bozulmaz). Başarısız denemeden sonra sırayla ipuçları açılır, iki başarısız denemeden sonra örnek çözüm gösterilebilir; her kod diliyle (Düğüm, Türkçe, C++, Java) çözülür. İlerleme tarayıcıda tutulur, menüde ✓ görünür, ders planında alıştırma yalnızca doğru çözülünce "yapıldı" sayılır. On altı alıştırma: listeyi ters çevir, ortadaki düğüm, uzunluk, sona ekle, yinelenenleri sil, liste sıralı mı, listede döngü var mı, bağlı listeyle yığın, dizide en büyük değer, ikili arama, kabarcık sıralama, ağacın yüksekliği, ağaçtaki değerlerin toplamı, matriste satır toplamı, Pascal üçgeni, ızgarada yol sayısı.
- Sınıf (öğretmenler, `class.html`): öğretmen e-posta ve şifreyle girer (sınıf açmak için e-postası doğrulanmış olmalı), bir ders planıyla sınıf açar ve öğrencilere `plan.html#plan=…&class=KOD` bağlantısını verir. Öğrenci yalnızca bir takma adla katılır; plandaki alıştırmalarda yaptığı kontroller öğretmene gider. Öğretmen öğrenci × alıştırma tablosunu görür, bir öğrencinin denemelerini (kod, karşılaştırma çizimi, hata) açar, yeni katılımı kapatır, öğrenciyi ya da sınıfın bütün verisini siler. Veriler Firebase'te (Firestore) durur; sınıfa katılmamış hiç kimsenin sayfası dışarıya istek yapmaz. Kurulum aşağıda ("Sınıf kurulumu").
- Alıştırmalarda öğrenci kendi hatasını görür: başarısız bir kontrolde her tutmayan beklentinin altında **beklenen** ve **senin sonucun** yan yana çizilir (liste, dizi, matris ya da tek değer; farklı, eksik ve fazla elemanlar işaretli). Her kontrol (geçen, kalan, kodu çalışmayan) tarayıcıda **deneme geçmişine** yazılır: öğrenci eski kodunu, sonucunu ve çizimini açıp editöre geri yükleyebilir. Her şey öğrencinin tarayıcısında kalır; gizli test kodu ve girdileri hiçbir yerde görünmez.
- Adım karşılaştırma: her adımda değişen şeyin önceki hali (eski bağ, pointer'ın eski yeri, eski değer) soluk ve kesik çizgiyle arkada görünür; ayarlardan kapatılabilir.
- Siteye ilk gelen kullanıcıya kısa bir tanıtım turu sayfanın bölümlerini sırayla gösterir (ayarlardan yeniden başlatılabilir).
- Kod dili seçilebilir: ayarlarda **Düğüm (Türkçe)** seçilince örnekler Türkçe kelimelerle gösterilir ve çalışır (`değişken`, `eğer`, `yinele`, `için`, `yaz`, `boş`, `yeni Düğüm(1)`, `p.sonraki`, `p.veri`; kelime kelime çevrilir). **C++** ya da **Java** seçilince örnekler otomatik olarak o dile çevrilip gösterilir ve çalışır (C++: `Node*`, `->`, `new`/`delete`, `nullptr`, `cout`; Java: `Node p`, `Node[]`, `System.out.println`, `static` metotlar, `delete` yerine çöp toplayıcı). Kod çalıştırılmadan önce satır satır Düğüm'e çevrilir (`js/codelang.js`), böylece çizim ve anlatım aynen çalışır.
- Soldaki editöre JavaScript benzeri kısa kodlar yazılır (`var x = new Node(1)`, `x.next = y`, `while`, `for`, `if`, `function`). Her satır çalışırken düğümler, `next` okları ve pointer'lar tuvalde çizilir.
- Fonksiyonlar ve özyineleme: her çağrı, yerel değişkenleriyle birlikte "Çağrı yığını" panelinde görünür.
- Tuvalin üstündeki düğmelerle ya da adım çubuğuyla animasyon oynatılır, duraklatılır, adım adım ileri ve geri alınır, hızı ayarlanır (kısayollar: ← → boşluk).
- Her adım bir cümleyle açıklanır; o adımda değişen bağ ya da pointer vurgulanır. `null` bağlar çapraz çizgiyle gösterilir, artık hiçbir yerden ulaşılamayan düğümler için uyarı çıkar.
- Ders modu: sayfanın başındaki "Ders modu" düğmesi (ya da ayarlar) sayfayı bölümlere ayırır; her seferinde bir açıklama ve bir kod bloğu görünür, Önceki/Sonraki ile ilerlenir ve bölümün bloğu kendiliğinden çalışır.
- Değiştirilen kod bağlantıyla paylaşılır: blokların altındaki bağlantı düğmesi, sayfanın kendi kodundan farklı olan blokları adresin `#` kısmına koyar ve bağlantıyı kopyalar (sunucu gerekmez). Bağlantıyı açan kişi aynı sayfayı o kodla görür; kod kendiliğinden çalışmaz, okuyup Çalıştır'a basmak gerekir.
- Bir kod bloğu çalıştırılınca çizim temiz başlar: üstündeki bloklar kendiliğinden yeniden çalışır, böylece bir bloğu değiştirip tekrar çalıştırmak her zaman aynı noktadan başlar.
- Düğümler otomatik yerleşir: her liste kendi satırında soldan sağa durur, değişiklikler animasyonla gösterilir. Dairesel bir listede son düğümden başa dönen bağ, pointer adlarının üstünden dolaşan bir okla çizilir; satır `tail`'in gösterdiği düğümden sonra başlar.
- Kodda `.left` ya da `.right` geçince düğümler ağaç düğümü olarak çizilir ([sol | değer | sağ]); her düğüm derinliğine göre bir satıra, sıralı dolaşımdaki yerine göre bir sütuna yerleşir, böylece ikili arama ağacı soldan sağa sıralı okunur.
- Değişkenler görselleştirmenin altındaki panelde listelenir; tüm örneklere üst çubuktaki menüden ulaşılır. Açık ve koyu tema vardır. Telefonda görselleştirme kodun üstünde durur; altındaki paneller (çağrı yığını, değişkenler, çıktı) tek satırlık düğmelerle açılıp kapanır.
- Hatalar anlaşılır biçimde açıklanır (hangi satırda, ne yanlış gitti).
- Üç dil: Türkçe, İngilizce ve Almanca. Arayüz, adım anlatımı, hata mesajları, ders metinleri ve kod yorumları çevrilmiştir. İlk açılışta tarayıcının dili seçilir.
- Üst çubuğun sağındaki dişli düğmesi ayarları açar: dil, tema (sistem / açık / koyu), varsayılan animasyon hızı, kod yazı boyutu, adım anlatımı ve kopan düğüm uyarısı. Ayarlar tarayıcıda saklanır.
- Hazır örnekler: uzunluk, toplam / en büyük / arama, başa / sona / sıralı ekleme, silme, tekrar edenleri silme, ters çevirme, ortadaki düğüm, sondan k'ıncı düğüm, döngü tespiti, çift yönlü liste, dairesel liste, dairesel çift yönlü liste, Josephus problemi, kabarcık / eklemeli / birleştirmeli sıralama, ikili arama ağacı (ekleme, arama, dolaşma, yükseklik, silme), AVL ağacı, zincirlemeli hash tablosu, yığın, kuyruk, fonksiyonlar, özyineleme, iki listeyi karşılaştırma ve birleştirme.

## Yerelde çalıştırma

Sayfalar `js/linkedlist.js` dosyasını tarayıcıdan yüklediği için bir web sunucusu gerekir:

```bash
python3 -m http.server 8000
```

Ardından http://localhost:8000 adresini açın. Node.js kuruluysa `npm start` de olur (http://localhost:8765).

## Sınıf kurulumu

Sınıf özelliği bir Firebase projesine bağlanır; `js/firebase-config.js` boşken (`null`) özellik kapalıdır ve hiçbir sayfa dışarıya bağlanmaz.

1. [Firebase konsolunda](https://console.firebase.google.com) yeni bir proje açın (Google Analytics gerekmez).
2. **Authentication → Sign-in method**: *Email/Password* ve *Anonymous* yöntemlerini açın.
3. **Authentication → Settings → Authorized domains**: sitenin alan adını ekleyin (ör. `mehmetakifakkus.github.io`).
4. **Firestore Database → Create database**: üretim modunda, bir Avrupa bölgesinde (ör. `europe-west3`) oluşturun.
5. **Firestore → Rules**: depodaki `firestore.rules` dosyasının içeriğini yapıştırıp yayınlayın (ya da `npx firebase deploy --only firestore:rules`).
6. **Project settings → Your apps → Web app** ekleyin; çıkan `apiKey` ve `projectId` değerlerini `js/firebase-config.js` dosyasına yazın:
   ```js
   window.dsvFirebaseConfig = {apiKey: 'AIza...', projectId: 'proje-kimligi'};
   ```
   Bu değerler her Firebase web uygulamasında herkese açıktır; veriyi Firestore kuralları korur.
7. Dönem sonunda öğretmen `class.html`'de "Sınıfı ve bütün verisini sil" ile sınıfın verisini siler; öğrenci de plan sayfasında "Ayrıl ve verilerimi sil" ile kendi verisini silebilir.

Kurallar Firestore emülatöründe test edilir (Java 21 gerekir): `npm run test:rules`.

## Testler

Testler [Playwright](https://playwright.dev) ile gerçek bir tarayıcıda çalışır ve GitHub Actions'ta her PR'da kendiliğinden çalıştırılır.

```bash
npm install
npx playwright install chromium
npm test
```

- `tests/classroom.spec.js`: sınıf; veri katmanı (sahte arka uç ve Firebase REST istekleri), öğretmen sayfası, öğrencinin katılması ve gönderimi. `tests/rules/rules.test.mjs`: Firestore kuralları, emülatörde (`npm run test:rules`).
- `tests/exercise.spec.js`: alıştırma sayfaları; başlangıç kodu geçmez, örnek çözüm geçer, ipucu ve çözüm kuralları, hata ve sonsuz döngü deneme sayılmaz, ilerleme ve ders planı, dört kod dili.
- `tests/grammar.spec.js`: tarayıcısız gramer testleri; örnek sayfalardaki her kod bloğunun ayrıştırılabildiğini ve zor girdilerin doğru okunduğunu kontrol eder.
- `tests/pages.spec.js`: her sayfanın bütün bloklarını çalıştırır; hata olmamasını, sitenin dışına istek gitmemesini ve sayfanın beklenen son durumda bitmesini kontrol eder. **Yeni bir sayfa eklerken** beklenen son durumunu bu dosyadaki `EXPECTED` listesine yazın, yoksa test başarısız olur.
- `tests/language.spec.js`: dil özellikleri (döngüler, fonksiyonlar, özyineleme, koşullar) ve Türkçe hata mesajları.
- `tests/ui.spec.js`: oynatıcı, çağrı yığını, değişkenler paneli, komut satırı, tema, örnek menüsü, telefon düzeni.
- `tests/i18n.spec.js`: her metnin üç dilde de olması, sayfaların İngilizce ve Almanca içeriği, dil seçimi ve ayarlar paneli. Sayfa testleri (`pages.spec.js`) her sayfayı üç dilde çalıştırır.

Testler kendi küçük sunucularını (`tests/server.js`) başlatır; elle açmak için `npm start` yeterli.

## Nasıl çalışıyor?

- `grammer.pegjs`: Düğüm dilinin PEG.js grameri. Sayfalar onu değil, önceden derlenmiş hâlini (`js/grammar.js`) yükler. **Grameri değiştirdikten sonra** `npm run build:grammar` çalıştırın ve `js/grammar.js`'yi de commit edin; `js/grammar.js` eski kalırsa bir test başarısız olur. (`tools/build-grammar.js` yalnızca Node.js ister; PEG.js 0.9 repoda, `js/peg-0.9.0.min.js`.)
- `js/linkedlist.js`: kodu çalıştıran, adımları kuyruğa alan ve paper.js ile çizen motor.
- `js/layout.js`: her sayfanın üst çubuğunu, örnek menüsünü ve görselleştirme kartını kurar. Örneklerin listesi de buradadır; yeni bir örnek eklemek için sayfayı oluşturup listeye bir satır eklemek yeterli.
- `js/i18n.js`: ayarlar ve arayüz metinleri (tr / en / de). Sayfadan önce yüklenir; yeni bir metin eklerken üç dili de yazın.
- Sayfaların içeriği her dil için ayrı öğelerde durur: `<p data-lang="tr">…</p><p data-lang="en">…</p><p data-lang="de">…</p>`. Kod bloğunun İngilizce/Almanca hâli, bloğun hemen altındaki `<script type="text/plain" class="code-variant" data-for="text2" data-lang="en">` içindedir (yalnızca kodda Türkçe yorum ya da isim varsa gerekir). `js/layout.js` seçilen dili bırakır, diğerlerini kaldırır.
- `css/app.css`: tek stil dosyası; açık ve koyu tema renkleri burada.
- `vendor/`: CodeMirror 5.25.2 (MIT lisanslı), editör için; JavaScript ve C/C++/Java (clike) kipleri.

## Sıkça sorulan sorular

**Bu kodlarla uygulama geliştirmek mümkün mü, yoksa öğretmek amacıyla mı?**
Amaç öğretmek: programlamayı ana dilde öğrenmek isteyenler için bir araç. Herhangi bir yazılım kurmayı gerektirmemesi ve kodun çalışmasını adım adım göstermesi en önemli avantajları. Oyun ya da web programlama gibi alanları bu işte ustalaşmış dillere bırakıyoruz; algoritma geliştirmek ve bunların veri yapılarıyla nasıl çalıştığını anlamak daha önemli bir ihtiyaç, enerjimizi buraya yoğunlaştırıyoruz.

**İngilizce olsa daha iyi olmaz mıydı, neden Türkçe?**
Türkçe olmasının yeni başlayanlar için motive edici olduğunu düşünüyoruz. Mantığı anladıktan sonra yeni bir dil birkaç gün içinde öğrenilebilir.

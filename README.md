# Bağlı Liste Görselleştirme (Linked List Visualisation)

<img float="left" src="https://mehmetakifakkus.github.io/dsviz/css/images/main.png" width="800"/>

Bağlı listelerin (linked list) nasıl çalıştığını, yazdığınız kodu adım adım çizerek gösteren bir eğitim aracı. Kurulum gerektirmez, tarayıcıda çalışır.

[Uygulamayı açın](https://mehmetakifakkus.github.io/dsviz/)

## Neler var?

- Kodlar bu iş için geliştirilmiş, JavaScript'e benzeyen **Düğüm** dilinde yazılır; dilin rehberi sitede ayrı bir sayfadadır (`language.html`, menüde "Başlarken").
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
- Hazır örnekler: uzunluk, toplam / en büyük / arama, başa / sona / sıralı ekleme, silme, tekrar edenleri silme, ters çevirme, ortadaki düğüm, sondan k'ıncı düğüm, döngü tespiti, çift yönlü liste, dairesel liste, Josephus problemi, kabarcık / eklemeli / birleştirmeli sıralama, ikili arama ağacı (ekleme, arama, dolaşma, yükseklik, silme), AVL ağacı, zincirlemeli hash tablosu, yığın, kuyruk, fonksiyonlar, özyineleme, iki listeyi karşılaştırma ve birleştirme.

## Yerelde çalıştırma

Sayfalar `js/linkedlist.js` dosyasını tarayıcıdan yüklediği için bir web sunucusu gerekir:

```bash
python3 -m http.server 8000
```

Ardından http://localhost:8000 adresini açın. Node.js kuruluysa `npm start` de olur (http://localhost:8765).

## Testler

Testler [Playwright](https://playwright.dev) ile gerçek bir tarayıcıda çalışır ve GitHub Actions'ta her PR'da kendiliğinden çalıştırılır.

```bash
npm install
npx playwright install chromium
npm test
```

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
- `vendor/`: CodeMirror 5.25.2 (MIT lisanslı), editör için.

## Sıkça sorulan sorular

**Bu kodlarla uygulama geliştirmek mümkün mü, yoksa öğretmek amacıyla mı?**
Amaç öğretmek: programlamayı ana dilde öğrenmek isteyenler için bir araç. Herhangi bir yazılım kurmayı gerektirmemesi ve kodun çalışmasını adım adım göstermesi en önemli avantajları. Oyun ya da web programlama gibi alanları bu işte ustalaşmış dillere bırakıyoruz; algoritma geliştirmek ve bunların veri yapılarıyla nasıl çalıştığını anlamak daha önemli bir ihtiyaç, enerjimizi buraya yoğunlaştırıyoruz.

**İngilizce olsa daha iyi olmaz mıydı, neden Türkçe?**
Türkçe olmasının yeni başlayanlar için motive edici olduğunu düşünüyoruz. Mantığı anladıktan sonra yeni bir dil birkaç gün içinde öğrenilebilir.

# Bağlı Liste Görselleştirme (Linked List Visualisation)

<img float="left" src="https://mehmetakifakkus.github.io/dsviz/css/images/main.png" width="800"/>

Bağlı listelerin (linked list) nasıl çalıştığını, yazdığınız kodu adım adım çizerek gösteren bir eğitim aracı. Kurulum gerektirmez, tarayıcıda çalışır.

[Uygulamayı açın](https://mehmetakifakkus.github.io/dsviz/)

## Neler var?

- Soldaki editöre JavaScript benzeri kısa kodlar yazılır (`var x = new Node(1)`, `x.next = y`, `while`, `for`, `if`, `function`). Her satır çalışırken düğümler, `next` okları ve pointer'lar tuvalde çizilir.
- Fonksiyonlar ve özyineleme: her çağrı, yerel değişkenleriyle birlikte "Çağrı yığını" panelinde görünür.
- Tuvalin üstündeki düğmelerle ya da adım çubuğuyla animasyon oynatılır, duraklatılır, adım adım ileri ve geri alınır, hızı ayarlanır (kısayollar: ← → boşluk).
- Her adım bir Türkçe cümleyle açıklanır; o adımda değişen bağ ya da pointer vurgulanır. `null` bağlar çapraz çizgiyle gösterilir, artık hiçbir yerden ulaşılamayan düğümler için uyarı çıkar.
- Bir kod bloğu çalıştırılınca çizim temiz başlar: üstündeki bloklar kendiliğinden yeniden çalışır, böylece bir bloğu değiştirip tekrar çalıştırmak her zaman aynı noktadan başlar.
- Düğümler otomatik yerleşir: her liste kendi satırında soldan sağa durur, değişiklikler animasyonla gösterilir.
- Değişkenler görselleştirmenin altındaki panelde listelenir; tüm örneklere üst çubuktaki menüden ulaşılır. Açık ve koyu tema vardır, telefonda da kullanılabilir.
- Hatalar Türkçe ve anlaşılır biçimde açıklanır (hangi satırda, ne yanlış gitti).
- Hazır örnekler: uzunluk, toplam / en büyük / arama, başa / sona / sıralı ekleme, silme, tekrar edenleri silme, ters çevirme, ortadaki düğüm, sondan k'ıncı düğüm, döngü tespiti, çift yönlü liste, yığın, kuyruk, fonksiyonlar, özyineleme, iki listeyi karşılaştırma ve birleştirme.

## Yerelde çalıştırma

Sayfalar `grammer.pegjs` ve `js/linkedlist.js` dosyalarını tarayıcıdan yüklediği için bir web sunucusu gerekir:

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

Testler kendi küçük sunucularını (`tests/server.js`) başlatır; elle açmak için `npm start` yeterli.

## Nasıl çalışıyor?

- `grammer.pegjs`: dilin PEG.js grameri. Kod sayfa açılınca tarayıcıda derlenir.
- `js/linkedlist.js`: kodu çalıştıran, adımları kuyruğa alan ve paper.js ile çizen motor.
- `js/layout.js`: her sayfanın üst çubuğunu, örnek menüsünü ve görselleştirme kartını kurar. Örneklerin listesi de buradadır; yeni bir örnek eklemek için sayfayı oluşturup listeye bir satır eklemek yeterli.
- `css/app.css`: tek stil dosyası; açık ve koyu tema renkleri burada.
- `vendor/`: CodeMirror 5.25.2 (MIT lisanslı), editör için.

## Sıkça sorulan sorular

**Bu kodlarla uygulama geliştirmek mümkün mü, yoksa öğretmek amacıyla mı?**
Amaç öğretmek: programlamayı ana dilde öğrenmek isteyenler için bir araç. Herhangi bir yazılım kurmayı gerektirmemesi ve kodun çalışmasını adım adım göstermesi en önemli avantajları. Oyun ya da web programlama gibi alanları bu işte ustalaşmış dillere bırakıyoruz; algoritma geliştirmek ve bunların veri yapılarıyla nasıl çalıştığını anlamak daha önemli bir ihtiyaç, enerjimizi buraya yoğunlaştırıyoruz.

**İngilizce olsa daha iyi olmaz mıydı, neden Türkçe?**
Türkçe olmasının yeni başlayanlar için motive edici olduğunu düşünüyoruz. Mantığı anladıktan sonra yeni bir dil birkaç gün içinde öğrenilebilir.

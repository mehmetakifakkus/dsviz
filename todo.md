# Yapılacaklar

Öncelik sırası kabaca yukarıdan aşağıya. Tamamlananlar en altta.

## Dil

- [ ] **Fonksiyonlar**: `function push(v) { ... }`, `return`, çağrı `push(5)`.
  - Yerel değişkenler: şu an bütün kullanıcı değişkenleri `window` üzerinde global. Fonksiyonlar için çağrı başına bir kapsam (scope) gerekir; `window.eval` yerine kendi değişken ortamımızı tutmak en temiz yol.
  - Özyineleme (recursion) desteği ve sınır (ör. 200 derinlik) aşılınca Türkçe hata.
  - Görselleştirme: çağrı yığını (call stack) paneli, her çağrının yerel değişkenleri; yerel pointer'lar çizimde fonksiyon adıyla gösterilebilir (`push.n`).
  - Örnekler: yığın/kuyruk işlemlerini fonksiyon olarak yazma, listeyi özyinelemeli ters çevirme, listeyi sondan başa yazdırma.
- [ ] `var a = 1, b = 2` yalnızca `a`'yı tanımlıyor; virgülle ayrılan tanımların hepsi işlenmeli.
- [ ] `Node(3, y)` yazımında ikinci argüman (next) gramerde var ama motor yok sayıyor.
- [ ] İsteğe bağlı Türkçe anahtar kelimeler: gramer `eğer`, `değilse`, `yinele` kelimelerini tanıyor; örneklerde bir "Türkçe kod" seçeneği sunulabilir.
- [ ] Dizi (array) desteği: yığın ve kuyruğun dizi ile yapılmış hâllerini göstermek için.

## Görselleştirme ve arayüz

- [ ] Arayüzün modernleştirilmesi (alternatifler değerlendiriliyor).
- [ ] Bir kod bloğu ikinci kez çalıştırılınca eski çizimler kalıyor ve listenin ikinci bir kopyası çiziliyor; blok tekrar çalışınca onun önceki çizimleri temizlenmeli.
- [ ] Değişkenler alanı tuvalin içine çizilen metin; HTML bir tablo/panel olursa okunması ve kopyalanması kolaylaşır.
- [ ] Uzun listeler tuvalin dışına taşıyor: yakınlaştırma/sığdırma (zoom to fit) ya da kaydırma.
- [ ] Mobil uyum: tuval sabit 1200x900 ve `position: fixed`.
- [ ] Koyu tema.
- [ ] Kodu bağlantı ile paylaşma (kod URL'de saklanır).

## Yeni konular

- [ ] Dairesel (circular) bağlı liste.
- [ ] Bağlı liste sıralama: insertion sort, merge sort.
- [ ] İkili arama ağacı (BST): ekleme, arama, dolaşma (yeni bir yerleşim türü gerekir).
- [ ] Hash tablosu (zincirleme / chaining).

## Altyapı

- [ ] Tarayıcı testlerini (Playwright) repoya eklemek ve GitHub Actions'ta her PR'da çalıştırmak: her sayfa hatasız çalışmalı ve beklenen son durumu vermeli.
- [ ] Grameri önceden derlemek: şu an `grammer.pegjs` her sayfa açılışında tarayıcıda derleniyor.
- [ ] Kullanılmayan dosyaları kaldırmak: `js/index.js`, `js/backup/`, `js/custom-mode.js`, `js/mode/codemirror.js` (yerine `vendor/` kullanılıyor), `css/mdb.min.css` (yalnızca yorum satırında). `js/mode/css.js`, `js/mode/simple.js` ve `js/bootstrap.min.js` yükleniyor ama kullanılmıyor.
- [ ] `faq.txt` içeriğini README'ye taşımak.
- [ ] jQuery 2 ve Bootstrap 3 bağımlılıklarından kurtulmak (yalnızca `$.get` ve ızgara sınıfları kullanılıyor).

## Bilinen sorunlar

- [ ] Komut satırında döngülü bir listeyi yazdırmak (`x`) sonsuz özyinelemeye giriyor (`createSummary` döngüyü fark etmiyor).
- [ ] Çift yönlü listede ters çevirmeden sonra tüm oklar yay olarak çiziliyor (düğümler yerinde kaldığı için); okunuyor ama kalabalık.

## Tamamlananlar

- [x] Gramer düzeltmeleri (ifade satırları, tanımlayıcı ve yorum karakterleri, anahtar kelime önekleri, `else` gövdesi, `print`).
- [x] Çalıştırma/çizim zamanlaması: her adım çalıştığı andaki değerlerle çiziliyor.
- [x] Otomatik yerleşim ve adım adım oynatıcı (ileri, geri, hız).
- [x] Türkçe arayüz ve öğrenciye yönelik Türkçe hata mesajları.
- [x] `for`, `break`, `continue`, `i++`, `i += n`, `new Node(ifade)`.
- [x] Çift yönlü liste, yığın, kuyruk ve toplam 19 örnek sayfa.
- [x] CodeMirror repoya alındı; site dış CDN'e bağlı değil.

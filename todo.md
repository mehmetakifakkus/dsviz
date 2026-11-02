# Yapılacaklar

Öncelik sırası kabaca yukarıdan aşağıya. Tamamlananlar en altta.

## Dil

- [ ] Koşullar bir karşılaştırma operatörü istiyor: `if(isEmpty())` ya da `while(p)` yazılamıyor, `if(isEmpty() == true)` yazmak gerekiyor.
- [ ] Fonksiyon içinde fonksiyon tanımı (closure) yok: fonksiyonlar yalnızca kendi yerel değişkenlerini ve globalleri görür.
- [ ] Çağrı sonucunun alanına erişim (`pop().data`) gramerde yok.
- [ ] `var a = 1, b = 2` yalnızca `a`'yı tanımlıyor; virgülle ayrılan tanımların hepsi işlenmeli.
- [ ] `Node(3, y)` yazımında ikinci argüman (next) gramerde var ama motor yok sayıyor.
- [ ] İsteğe bağlı Türkçe anahtar kelimeler: gramer `eğer`, `değilse`, `yinele` kelimelerini tanıyor; örneklerde bir "Türkçe kod" seçeneği sunulabilir.
- [ ] Dizi (array) desteği: yığın ve kuyruğun dizi ile yapılmış hâllerini göstermek için.

## Görselleştirme ve arayüz

- [ ] Bir kod bloğu ikinci kez çalıştırılınca eski çizimler kalıyor ve listenin ikinci bir kopyası çiziliyor; blok tekrar çalışınca onun önceki çizimleri temizlenmeli.
- [ ] Kodu bağlantı ile paylaşma (kod URL'de saklanır).
- [ ] İsteğe bağlı "ders modu": blokları tek tek gösteren, Önceki/Sonraki ile ilerleyen görünüm (değerlendirilen alternatiflerden B).
- [ ] Telefonda görselleştirme kartı ekranın yarısını kaplıyor; değişkenler ve çıktı bölümü katlanabilir olabilir.

## Yeni konular

- [ ] Dairesel (circular) bağlı liste.
- [ ] Bağlı liste sıralama: insertion sort, merge sort.
- [ ] İkili arama ağacı (BST): ekleme, arama, dolaşma (yeni bir yerleşim türü gerekir).
- [ ] Hash tablosu (zincirleme / chaining).

## Altyapı

- [ ] Tarayıcı testlerini (Playwright) repoya eklemek ve GitHub Actions'ta her PR'da çalıştırmak: her sayfa hatasız çalışmalı ve beklenen son durumu vermeli.
- [ ] Grameri önceden derlemek: şu an `grammer.pegjs` her sayfa açılışında tarayıcıda derleniyor.

## Bilinen sorunlar

- [ ] Komut satırında döngülü bir listeyi yazdırmak (`x`) sonsuz özyinelemeye giriyor (`createSummary` döngüyü fark etmiyor).
- [ ] Çift yönlü listede ters çevirmeden sonra tüm oklar yay olarak çiziliyor (düğümler yerinde kaldığı için); okunuyor ama kalabalık.

## Tamamlananlar

- [x] Gramer düzeltmeleri (ifade satırları, tanımlayıcı ve yorum karakterleri, anahtar kelime önekleri, `else` gövdesi, `print`).
- [x] Çalıştırma/çizim zamanlaması: her adım çalıştığı andaki değerlerle çiziliyor.
- [x] Otomatik yerleşim ve adım adım oynatıcı (ileri, geri, hız).
- [x] Türkçe arayüz ve öğrenciye yönelik Türkçe hata mesajları.
- [x] `for`, `break`, `continue`, `i++`, `i += n`, `new Node(ifade)`.
- [x] Çift yönlü liste, yığın, kuyruk, fonksiyonlar ve özyineleme; toplam 21 örnek sayfa.
- [x] CodeMirror repoya alındı; site dış CDN'e bağlı değil.
- [x] Modern arayüz: üst çubuk, örnek menüsü, sabit görselleştirme kartı, önceki/sonraki bağlantıları; sayfalar yalnızca içerik taşıyor, iskelet `js/layout.js`'den kuruluyor.
- [x] Değişkenler HTML panelinde; tuval kartın genişliğine uyuyor, yüksekliği çizime göre ayarlanıyor, uzun listeler sığacak şekilde küçültülüyor.
- [x] Koyu tema (sistem ayarına uyar, elle değiştirilebilir) ve mobil uyum.
- [x] Bootstrap 3, jQuery ve kullanılmayan dosyalar kaldırıldı; SSS README'ye taşındı.
- [x] Fonksiyonlar: `function` / `fonksiyon`, parametreler, yerel değişkenler, `return` / `döndür`, ifade içinde çağrı, özyineleme (200 çağrı sınırı); çağrı yığını paneli ve yerel pointer'lar (özyinelemede `p`, `p₂`, `p₃`).

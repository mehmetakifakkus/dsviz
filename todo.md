# Yapılacaklar

Öncelik sırası kabaca yukarıdan aşağıya. Tamamlananlar en altta.

## Dil

- [ ] Fonksiyon içinde fonksiyon tanımı (closure) yok: fonksiyonlar yalnızca kendi yerel değişkenlerini ve globalleri görür.
- [ ] Çağrı sonucunun alanına erişim (`pop().data`) gramerde yok.
- [ ] `var a = 1, b = 2` yalnızca `a`'yı tanımlıyor; virgülle ayrılan tanımların hepsi işlenmeli.
- [ ] `Node(3, y)` yazımında ikinci argüman (next) gramerde var ama motor yok sayıyor.
- [ ] İsteğe bağlı Türkçe anahtar kelimeler: gramer `eğer`, `değilse`, `yinele` kelimelerini tanıyor; örneklerde bir "Türkçe kod" seçeneği sunulabilir.
- [ ] Dizi (array) desteği: yığın ve kuyruğun dizi ile yapılmış hâllerini göstermek için.

## Görselleştirme ve arayüz

- [ ] Kodu bağlantı ile paylaşma (kod URL'de saklanır).
- [ ] İsteğe bağlı "ders modu": blokları tek tek gösteren, Önceki/Sonraki ile ilerleyen görünüm (değerlendirilen alternatiflerden B).
- [ ] Telefonda görselleştirme kartı ekranın yarısını kaplıyor; değişkenler ve çıktı bölümü katlanabilir olabilir.

## Yeni konular

- [ ] Hash tablosu (zincirleme / chaining).

## Altyapı

- [ ] Sayfaların çevirisi HTML içinde duruyor; dil sayısı artarsa içerik dil başına ayrı dosyalara taşınabilir.

- [ ] Grameri önceden derlemek: şu an `grammer.pegjs` her sayfa açılışında tarayıcıda derleniyor.

## Bilinen sorunlar

- [ ] Dairesel çift yönlü listede ilk düğümün `prev`'i (sona dönen bağ) hâlâ satırın altından bir yay olarak çiziliyor.
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
- [x] Operatörsüz koşullar: `if(p)`, `while(p.next)`, `while(!isEmpty())`, `if(p && p.next)`; `!`, `not`, `değil`, iç içe parantez.
- [x] Tarayıcı testleri (Playwright, şu an 184 test) ve her PR'da çalışan GitHub Actions iş akışı.
- [x] Bir blok çalıştırılınca sayfa temiz başlar: üstündeki bloklar anında yeniden çalışır, sonra bu blok animasyonla çalışır (eski çizimler ve değişkenler kalmaz).
- [x] Öğrenme yardımcıları: her adımın Türkçe anlatımı, son adımda değişen bağ/pointer'ın vurgulanması, `null` bağların çapraz çizgiyle gösterilmesi, kendine dönen bağ ilmeği, kopan (ulaşılamayan) düğüm uyarısı.
- [x] Oynatıcıda adım çubuğu ve klavye kısayolları (← → boşluk); hata satırı editörde işaretlenir; değiştirilen örnek kod "Geri yükle" ile geri alınır.
- [x] Üç dil (Türkçe, İngilizce, Almanca): arayüz, anlatım, hata mesajları, 22 sayfanın metinleri ve kod yorumları; ayarlar paneli (dil, tema, hız, yazı boyutu, anlatım, uyarılar).
- [x] `x = new Node(9)` (`var` olmadan) artık doğru okunuyor; hız kaydırıcısı çalışıyor (PaperScript tekli `+` / `++` yeniden yazımı).
- [x] Dairesel bağlı liste (dolaşma, başa/sona O(1) ekleme, silme) ve Josephus problemi; başa dönen bağ pointer adlarının üstünden çizilir, halka `tail`'den sonra başlar; komut satırı döngülü listeleri sonsuza gitmeden yazdırır.
- [x] Sıralama: kabarcık (değerleri değiştirerek), eklemeli (bağları değiştirerek, bekçi düğümle) ve özyinelemeli birleştirmeli sıralama. `x.next = f(...)` gramerde; `p.data = q.data` çizimde güncellenir; bir çalıştırmanın sonunda sağdan sola kalan liste soldan sağa dizilir; çok sayıda pointer adı bir sütuna sığdırılır ("+2").
- [x] İkili arama ağacı: ağaç kipi (`left` / `right`, derinlik × sıralı dolaşım yerleşimi, pointer'lar düğümün altında), özyinelemeli ekleme, arama, en küçük değer, in/pre/post-order dolaşma, yükseklik; komut satırı ağaçları `{data, left, right}` olarak yazdırır.
- [x] Dilin adı **Düğüm**; üç dilde rehber sayfası (`language.html`: kısa özet tablosu, değişkenler, düğümler, koşullar ve döngüler, fonksiyonlar, Türkçe anahtar kelimeler, çift yönlü liste ve ağaçlar, komut satırı ve hatalar, JavaScript'ten farkları). `taban`, `tavan`, `karekök`, `mutlak` artık ifadelerin içinde de kullanılabiliyor; `var w = p.data * 2` doğru okunuyor.
- [x] İkili arama ağacında silme: yaprak, tek çocuklu ve iki çocuklu düğüm (ardılın değeri kopyalanır); değer değişikliği anlatımı düğümü eski değeriyle anar.
- [x] AVL ağacı: `height` alanı düğümün yanında `h=` olarak çizilir, sağa/sola döndürme, dört dengesizlik durumu, sıralı eklemede dengeli kalma. Bir alana ifade atanabilir (`t.height = a + 1`); `data`/bağ dışındaki alanların değişimi de anlatılır.

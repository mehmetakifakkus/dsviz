# Yapılacaklar

Öncelik sırası kabaca yukarıdan aşağıya. Tamamlananlar en altta.

## Dil

- [ ] Çağrı sonucunun alanına yazma (`find(3).next = x`); okuma artık var.
- [ ] İsteğe bağlı Türkçe anahtar kelimeler: gramer `eğer`, `değilse`, `yinele` kelimelerini tanıyor; örneklerde bir "Türkçe kod" seçeneği sunulabilir.


## Görselleştirme ve arayüz


## Yeni konular


## Altyapı

- [ ] Sayfaların çevirisi HTML içinde duruyor; dil sayısı artarsa içerik dil başına ayrı dosyalara taşınabilir.


## Bilinen sorunlar

- [ ] Dairesel çift yönlü listede ilk düğümün `prev`'i (sona dönen bağ) hâlâ satırın altından bir yay olarak çiziliyor.
- [ ] Çift yönlü listede ters çevirmeden sonra tüm oklar yay olarak çiziliyor (düğümler yerinde kaldığı için); okunuyor ama kalabalık.

## Bilerek yapılmayanlar

- Fonksiyon içinde fonksiyon ve closure: Düğüm sade ve veri yapılarına yönelik kalsın diye fonksiyonlar yalnızca en dışta tanımlanır; iç içe tanım, kod çalışmadan açıklamalı bir hata verir.

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
- [x] Tarayıcı testleri (Playwright, şu an 288 test) ve her PR'da çalışan GitHub Actions iş akışı.
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
- [x] Diziler (`new Array(n)`, `t[i]` okuma ve yazma) ve zincirlemeli hash tablosu: dizi solda kovalar olarak çizilir, her kovanın zinciri kendi satırında; dizi hataları açıklanır; rehbere "Diziler" bölümü eklendi.
- [x] Kodu bağlantıyla paylaşma: değişen bloklar `#b2=...` olarak adreste (base64url); açılınca bloklara yüklenir, kendiliğinden çalışmaz (kod ziyaretçinin tarayıcısında JavaScript olarak çalıştığı için), bilgi şeridinden sayfanın koduna dönülür.
- [x] Gramer önceden derleniyor (`npm run build:grammar` → `js/grammar.js`): sayfalar PEG.js'yi ve grameri indirip derlemiyor (sıkıştırılmış aktarım ~35 KB → ~18 KB, bir istek ve derleme adımı eksik); `js/grammar.js` gramerle güncel değilse test başarısız olur.
- [x] Virgülle ayrılan tanımların hepsi işleniyor: `var a = 1, b = 2`, `var x = new Node(1), y = new Node(2)`, `a = 3, b = 4`, fonksiyon gövdesinde ve `for` başlığında da.
- [x] `new Node(değer, next)`: ikinci değer yeni düğümün `next`'i (herhangi bir ifade; düğüm ya da null olmalı), çizimde de bağlı görünür; başa ekleme tek satır: `x = new Node(8, x)`.
- [x] Çağrı sonucunun alanını okuma (`pop().data`, `find(3).next.data + 1`, koşullarda, `print`'te, `return`'de) ve iç içe düğüm oluşturma (`new Node(1, new Node(2, new Node(3)))`).
- [x] Yatay dizi çizimi: sayı tutan diziler üstte yatay hücreler, `s[size] = v` gibi yazımlarda indis değişkeni hücrenin altında okla; düğüm tutan diziler kova olarak kalır. Dizi ile yığın ve dairesel kuyruk sayfası.
- [x] Telefonda katlanabilir paneller: kanvasın altında tek satır düğme (Çağrı yığını · n, Değişkenler · n, Çıktı), aynı anda tek panel açık, yeni çıktı noktayla belirtilir, seçim hatırlanır; geniş ekranda paneller hep açık.
- [x] Ders modu: sayfa bölümlere ayrılır (açıklama + kod bloğu), Önceki/Sonraki ile ilerlenir ve bölümün bloğu kendiliğinden çalışır; sayfanın başındaki düğmeyle ya da ayarlardan açılır, hatırlanır.
- [x] Kod dili olarak C++: ayarlardan seçilir; örnekler türleri çıkarılarak C++'a çevrilir, C++ kodu satır satır Düğüm'e çevrilerek çalışır; C++ sözdizimi renklendirmesi, anlatımda `nullptr`/`->`, paylaşılan bağlantı dilini taşır; her sayfa C++'ta da test edilir.
- [x] Kod dili olarak Java: örnekler Java'ya çevrilir (`Node`, `Node[]`, `boolean`, `static`, `System.out.println`, `delete` yerine açıklayıcı yorum), elle yazılan Java (`public class Main`, `class Node`, `main(String[] args)`) çalışır; ulaşılamayan düğümler "çöp" olarak işaretlenir. Düğüm'de bir değişkene karşılaştırma sonucu atanabilir (`var ok = a == b`).
- [x] C++ ve Java'da tam sayı bölmesi: kaynak koddaki türler toplanır, iki tarafı da tam sayı olan `/` sıfıra doğru kesilir (`7 / 2` = 3, `-7 / 2` = -3), sıfıra bölme açıklamalı hata verir; anlatımda yine `a / b` görünür.
- [x] Birden çok kova dizisi yan yana çizilir (her biri bir öncekinin en uzun zincirinin sağında); kova satırları sıklaştırıldı; çok uzun çizimler ekrana sığacak kadar küçültülür. Hash sayfasına yeniden hash'leme bloğu eklendi.

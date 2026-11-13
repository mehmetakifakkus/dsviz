# Yapılacaklar

Öncelik sırası kabaca yukarıdan aşağıya. Tamamlananlar en altta.

## Dil



## Görselleştirme ve arayüz


## Yeni konular


## Altyapı

- [ ] Sayfaların çevirisi HTML içinde duruyor; dil sayısı artarsa içerik dil başına ayrı dosyalara taşınabilir.


## Bilinen sorunlar


## Bilerek yapılmayanlar

- Çağrı sonucunun alanına yazma (`find(3).next = x`): okuma (`find(3).data`) var, yazma yok; aynı iş `var p = find(3)` ve `p.next = x` ile yapılır ve adım adım izlemesi de daha kolaydır. Bu yazım, kodu düzeltmeyi anlatan açıklamalı bir hata verir.
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
- [x] Tarayıcı testleri (Playwright, şu an 623 test) ve her PR'da çalışan GitHub Actions iş akışı.
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
- [x] Dairesel çift yönlü liste: baştan sona dönen `prev` satırın altından dolaşan bir okla çizilir (sondan başa dönen `next`'in aynası); yeni sayfa: halka, geriye dolaşma, yalnızca `head` ile O(1) sona ekleme.
- [x] Ters çevrilen listede komşuya giden ters oklar büyük yaylar yerine kısa kancalar: `next` kendi düğümünün üstünden kıvrılıp soldaki düğümün sağ kenarına, `prev` altından sağdakinin sol kenarına girer; kancalar birbirini kesmez. Son adımda liste yeni başından soldan sağa yeniden dizilir (tek ve çift yönlü).
- [x] Heap ve öncelik kuyruğu: kod heap'in indis formüllerini (`2 * i + 1`, `taban((i - 1) / 2)`) kullanınca sayı dizisi satırın altında ağaç olarak da çizilir (hücre numaraları, yer değiştirilen hücreler vurgulu, çalışan çağrının yerel indisleri `i`, `j` hem satırda hem ağaçta); ağaç ilk boş hücreye ya da `h[n] = v`'deki boyut değişkenine kadar sürer. Yeni sayfa: ekleme (sift up), en küçüğü çıkarma (sift down), öncelik sırasıyla boşaltma. C++/Java'da `taban((i - 1) / 2)` `(i - 1) / 2` olarak gösterilir.
- [x] Türkçe kod: ayarlarda kod dili "Düğüm (Türkçe)" seçilince örnekler Türkçe kelimelerle gösterilir ve çalışır (`değişken`, `eğer`/`değilse`, `yinele`, `için`, `fonksiyon`, `döndür`, `kır`, `devam`, `yaz`, `boş`, `doğru`/`yanlış`, `yeni Düğüm(…)`, `yeni Dizi(n)`, `sil`, `ve`/`veya`/`değil`; alanlar `.veri`, `.sonraki`, `.önceki`, `.sol`, `.sağ`, `.yükseklik`). Kelime kelime iki yönde çevrilir, satır numaraları korunur; kod renklendirmesi, Türkçe yorumlar, anlatım, değişkenler paneli ve paylaşılan bağlantı aynı dili kullanır. Anlatımda `null` ve alan adları seçilen kod dilinde (C++'ta `nullptr`); bağ anlatımı "next bağı" olarak sadeleşti.
- [x] İlk ziyarette tanıtım turu: sayfanın bölümleri (kod blokları, Çalıştır, çizim, oynatıcı, anlatım, değişkenler ve çıktı, ders modu, kod dili ayarı, örnekler menüsü) sırayla aydınlatılır, sayfanın geri kalanı kararır; Sonraki/Geri (ya da ← →) ile ilerlenir, Atla ya da Esc ile çıkılır. Kod dili adımında ayarlar paneli açılır: site Düğüm ile açılır, C++, Java ya da Türkçe Düğüm seçilebilir. Bir kez gösterilir (localStorage), ayarlardan yeniden başlatılır; telefonda yapışkan çizim alanının altına kaydırır.
- [x] Hata mesajlarındaki kod örnekleri seçilen kod dilinde: Türkçe kodda `p != boş`, `.veri`, `kır` / `yinele` / `için`, `değişken b = ...`, `yeni Dizi(n)`; C++'ta `nullptr`, `->data`, `auto b = ...`, `int t[n]`; Java'da `int[] t = new int[n]`. Mesajlarda belirli bir dilin anahtar kelimesine dayanan anlatımlar ("var ile tanımlayın", "function ile") sadeleşti.
- [x] Graflar: adı `adj` (ya da `graph`, `graf`, `komşu`) olan ve listelerinde yalnızca köşe numaraları bulunan düğüm dizisi, kova ve listelerin sağında graf olarak da çizilir (köşeler dairede, iki yönlü kenar düz çizgi, tek yönlü kenar ok, yeni eklenen kenar turuncu); aynı boydaki `visited` dizisinde dolu köşeler renklenir, indis değişkenleri köşelerin yanında. Yeni sayfa: komşuluk listesi, BFS (kuyrukla) ve DFS (özyinelemeyle). Satır dizilerinde `true`/`false` seçilen kod dilinde ve hücreye sığacak boyda yazılır.
- [x] Ağırlıklı graflar ve Dijkstra: kenar düğümünün ağırlığı (`e.weight = w`, Türkçe kodda `.ağırlık`) listede düğümün üstünde, grafta kenarın ortasında; aynı boydaki `dist` dizisinin değerleri köşelerin içinde (`INF` ∞ olarak), `parent` dizisinin en kısa yol ağacı kalın mavi. Yeni sayfa: O(n²) Dijkstra ve yolun `parent` ile geri izlenmesi.
- [x] Adım karşılaştırma: bir adımın değiştirdiği şeyin önceki hali soluk ve kesik çizgiyle arkada kalır: değişen bağın eski hedefi, pointer'ın eski yeri (ve yeni yerine kesik bir ok), değişen değerin eskisi (üstü çizili; dizi hücresinde de). Ayarlardan kapatılabilir; geri/ileri oynatmada aynı sonucu verir. Düzeltme: geri sarıp yeniden oynatınca düğümler artık oluşturuldukları andaki değeri gösterir (sondaki değeri değil).
- [x] Dizide arama ve sıralama: sayı dizileri (adı `a`, `arr`, `dizi`, `nums`…) hücrelerin üstünde çubuk olarak da çizilir; bir adımın okuduğu (karşılaştırdığı) hücreler mavi, yazdığı hücre turuncu çerçevelenir; `a[mid]` gibi indisler ve `low`/`high`/`size` sınırları hücrelerin altında işaretlenir; oynatıcının yanında blok başına karşılaştırma ve yazma sayacı. Yeni sayfalar ("Dizilerde arama ve sıralama" grubu): doğrusal ve ikili arama, seçmeli, kabarcık, eklemeli, hızlı, heap ve sayarak sıralama, ve karşılaştırma sayacıyla sıralama karşılaştırması. Heap sort'ta global `size` ağacı küçültür.
- [x] Graf paketi ("Graflar" grubunda 6 yeni sayfa): topolojik sıralama (Kahn ve DFS, döngü tespiti; köşelerin içinde `indeg`), bağlı bileşenler (`comp` dizisi köşeleri renklendirir), birleşik küme (`leader` dizisi altta orman olarak çizilir; yol sıkıştırma), Kruskal (seçilen kenarlar `p.chosen = true` ile kalın mavi), Prim (`key` köşenin içinde, `parent` ağacı kalın) ve Bellman-Ford (negatif ağırlıklar, yönlü graf). 
- [x] Ders planı / öğretmen modu: `teacher.html`'de sayfalar seçilip sıralanır, her sayfaya not yazılır, kod dili ve ders modu belirlenir (6 hazır plan: bağlı listeler, yığın-kuyruk-özyineleme, arama ve sıralama, ağaçlar-heap-hash, graflar, dönem özeti); plan bağlantıda taşınır (`#plan=...`). Öğrenci `plan.html`'de listeyi ve notları görür, sayfalarda plan çubuğu (önceki/sonraki, plana dön), öğretmenin notu ve planın kod dili/ders modu geçerli olur; bir kod bloğu çalıştırılan sayfa tarayıcıda ✓ işaretlenir. Öğretmenin metinleri HTML değil metin olarak gösterilir; siteye ait olmayan sayfalar atılır; kod paylaşma bağlantıları planı korur.

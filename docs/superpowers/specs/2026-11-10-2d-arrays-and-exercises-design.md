# 2B diziler ve alıştırma modu: tasarım

İki bağımsız alt sistem, iki ayrı PR. Önce 2B diziler (alıştırmalar 2B konularını da kullanır), sonra alıştırma modu.

## Amaç

- 2B diziler: dinamik programlama, matris ve geri izleme konularını, hücrelerin okunup yazıldığı yerde görsel olarak anlatmak.
- Alıştırma modu: öğrencinin kod yazıp otomatik kontrolle doğruladığı görevler; ders planıyla çalışır, sunucu gerektirmez.

## Bölüm 1: 2B diziler

### Yazım
- `var g = new Array(3, 4)` (`new Dizi(3, 4)`): 3 satır, 4 sütun, hücreler `null`.
- `g[i][j]` ifade içinde okunur (JavaScript'e düşer); `g[i][j] = v` deyimdir (yeni gramer kuralı `matrix_assignment`).
- Sınır: en çok 12 satır, 12 sütun; geçersiz boyut için öğrenci diliyle hata.
- Düzensiz matris (`g[i] = new Array(..)`) ve 3B yok.

### Motor (js/linkedlist.js)
- `makeMatrix(r, c)`: tek görsel kayıt `visual.kind = 'grid'`, `cells[r][c]`; satırlar Proxy ile döner, hücre okumaları `{visual, row, col}` olarak `cellReads`'e düşer.
- Yazma: odak (`cell r,c`), adım karşılaştırma için eski değer (`ghosts.cells`), `stats.write` artar; okuma çerçevesi 1B dizideki gibi `stats.compare` sayar.
- `rowArrays()` ızgaraları da bandına katar (`rowBand`: satır sayısı kadar yükseklik).
- `dsvState`: `grids: [{name, cells, reads, focus}]` (testler için).

### Çizim
- Satır ve sütun numaralı ızgara; yazılan hücre turuncu, okunanlar çerçeveli, eski değer üstü çizili küçük yazı.
- İndeks değişkenleri (`i`, `j`) satır başlığında ve sütun başlığında ok olarak.
- Mobilde ve ders modunda ölçeklenir.

### Diller
- `codelang.js`: C++ `int g[3][4]`, Java `new int[3][4]`, Türkçe kelimeli sürümde `Dizi(3, 4)`; parite testleri.

### Sayfalar (tr/en/de, 6 dil/kod görünümünde test)
matrisGezme, pascal, gridPaths, lcs, knapsack, nQueens (4×4). Menü grubu "2B diziler ve dinamik programlama"; README ve todo güncellenir.

## Bölüm 2: Alıştırma modu

### Biçim
- Her alıştırma ayrı bir sayfa (mevcut ders iskeleti, yalnızca içerik): görev metni, düzenlenebilir başlangıç kodu, çizim paneli, Çalıştır ve **Kontrol et**.
- Menüde "Alıştırmalar" grubu; öğretmen kataloğu menüden beslendiği için plana eklenebilir.

### Tanım (sayfada JSON bloğu)
`setup` (önce çalışan kod), `starter`, `test` (öğrenci kodundan sonra gizli çalışan kod), `expect` (`[ifade, beklenen]` çiftleri; `output()` ve `walk()` yardımcıları), `hints[]`, `solution`.

### Kontrol
- Çalıştır: setup + öğrenci kodu, animasyonla.
- Kontrol et: setup + öğrenci kodu + test; sonra `expect` ifadeleri program değişkenlerinde değerlendirilir.
- Hepsi tutarsa "Doğru!". Tutmayanlar için "beklenen / senin sonucun"; gizli test gösterilmez.
- Öğrencinin kendi bloğundaki çalışma hatası mevcut öğrenci diliyle mesaj olur, başarısız deneme sayılmaz. Hata yalnızca gizli testte çıkarsa (ör. fonksiyonu boş listede çöküyor) yanlış cevap sayılır: deneme artar, hata mesajı gösterilir.
- Sonraki ipucu her denemeden sonra açılır; "Çözümü göster" 2 başarısız denemeden sonra çıkar ve editörü değiştirmez (ayrı, katlanır blok).

### İlerleme
- `localStorage['dsv-exercises']`: `{dosya: {done, attempts}}`; menüde ✓.
- Ders planında alıştırma sayfası açıldığında değil, doğru çözüldüğünde "yapıldı" sayılır (`dsvPlanMark` sadece geçişte).

### Diller
Her kod diliyle çalışır (Düğüm, Türkçe kelimeli Düğüm, C++, Java): başlangıç kodu seçili dilde gösterilir, öğrencinin yazdığı kod çalışmadan önce Düğüm'e çevrilir (siteye zaten var olan ters çeviri); gizli `setup`, `test` ve `expect` kodu Düğüm'dür ve dilden etkilenmez. (İlk tasarım yanlışlıkla "C++/Java'da Düğüm'e dönülür" diyordu; ters çeviri var, gerek yok.) Metinler tr/en/de.

### İlk içerik (8)
Listeyi ters çevir, ortadaki düğüm, uzunluk (fonksiyon), sona ekle, yinelenenleri sil, matriste satır toplamı, Pascal satırı, ızgarada yol sayısı.

### Testler
Yanlış çözüm hata gösterir; doğru çözüm geçer ve kalıcı olur; ipucu ve çözüm kuralları; yenilemeden sonra ilerleme; plan bütünleşmesi; her alıştırmanın örnek çözümünün kendi testini geçtiği doğrulanır.

## Kapsam dışı
Öğrenci sonuçlarını toplama, sıralama tablosu, süre ölçümü, çok adımlı sınavlar, sunucu.

## Sıra
1. PR: 2B diziler (motor, çizim, diller, 6 sayfa, testler, belgeler).
2. PR: alıştırma modu (altyapı, 8 alıştırma, testler, belgeler).

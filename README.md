# Bağlı Liste Görselleştirme (Linked List Visualisation)

<img float="left" src="https://mehmetakifakkus.github.io/dsviz/css/images/main.png" width="800"/>

Bağlı listelerin (linked list) nasıl çalıştığını, yazdığınız kodu adım adım çizerek gösteren bir eğitim aracı. Kurulum gerektirmez, tarayıcıda çalışır.

[Uygulamayı açın](https://mehmetakifakkus.github.io/dsviz/)

## Neler var?

- Soldaki editöre JavaScript benzeri kısa kodlar yazılır (`var x = new Node(1)`, `x.next = y`, `while`, `if`). Her satır çalışırken düğümler, `next` okları ve pointer'lar tuvalde çizilir.
- Tuvalin üstündeki düğmelerle animasyon oynatılır, duraklatılır, adım adım ileri ve geri alınır, hızı ayarlanır.
- Düğümler otomatik yerleşir: her liste kendi satırında soldan sağa durur, değişiklikler animasyonla gösterilir.
- Değişkenler görselleştirmenin altındaki panelde listelenir; tüm örneklere üst çubuktaki menüden ulaşılır. Açık ve koyu tema vardır, telefonda da kullanılabilir.
- Hatalar Türkçe ve anlaşılır biçimde açıklanır (hangi satırda, ne yanlış gitti).
- Hazır örnekler: uzunluk, toplam / en büyük / arama, başa / sona / sıralı ekleme, silme, tekrar edenleri silme, ters çevirme, ortadaki düğüm, sondan k'ıncı düğüm, döngü tespiti, iki listeyi karşılaştırma ve birleştirme.

## Yerelde çalıştırma

Sayfalar `grammer.pegjs` ve `js/linkedlist.js` dosyalarını tarayıcıdan yüklediği için bir web sunucusu gerekir:

```bash
python3 -m http.server 8000
```

Ardından http://localhost:8000 adresini açın.

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

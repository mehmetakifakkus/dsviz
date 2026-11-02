# Bağlı Liste Görselleştirme (Linked List Visualisation)

<img float="left" src="https://mehmetakifakkus.github.io/dsviz/css/images/main.png" width="800"/>

Bağlı listelerin (linked list) nasıl çalıştığını, yazdığınız kodu adım adım çizerek gösteren bir eğitim aracı. Kurulum gerektirmez, tarayıcıda çalışır.

[Uygulamayı açın](https://mehmetakifakkus.github.io/dsviz/)

## Neler var?

- Soldaki editöre JavaScript benzeri kısa kodlar yazılır (`var x = new Node(1)`, `x.next = y`, `while`, `if`). Her satır çalışırken düğümler, `next` okları ve pointer'lar tuvalde çizilir.
- Tuvalin üstündeki düğmelerle animasyon oynatılır, duraklatılır, adım adım ileri ve geri alınır, hızı ayarlanır.
- Düğümler otomatik yerleşir: her liste kendi satırında soldan sağa durur, değişiklikler animasyonla gösterilir.
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
- `vendor/`: CodeMirror 5.25.2 (MIT lisanslı), editör için.

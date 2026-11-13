# Sınıf: öğretmen öğrencilerin sonuçlarını görsün (Firebase)

## Amaç ve neden

Öğretmen, ders planındaki alıştırmalarda öğrencilerinin ne durumda olduğunu görmek istiyor: kim hangi alıştırmayı çözdü, kaç denemede, en son nerede takıldı. Öğrencinin kendi hatasını görmesi (karşılaştırma çizimi, deneme geçmişi) zaten tarayıcıda var; bu iş aynı kayıtları öğretmene ulaştırır. Dönem sonunda öğretmen sınıfın bütün verisini silebilmeli.

## Kullanıcının kararları

- Veritabanı **Firebase (Firestore)**, **yeni bir proje** açılacak. Projeyi kullanıcı kendi Google hesabıyla açar; bu oturum onun hesabına giremez.
- Öğretmen **e-posta ve şifreyle** giriş yapar; hangi cihazdan girerse girsin sınıflarını görür.
- **Dönem sonunda öğretmen silebilir:** sınıfın (ve tek tek öğrencilerin) bütün verisini.

## Hedefler

- Öğretmen bir sınıf açar, bir plan bağlantısına bağlar, öğrencilere tek bir bağlantı verir.
- Öğrenci o bağlantıdan bir takma adla sınıfa katılır; alıştırma kontrolleri sınıfa da yazılır.
- Öğretmen bir tabloda öğrenci × alıştırma durumunu görür ve bir öğrencinin denemelerini (kod, karşılaştırma çizimi, hata) açar.
- Öğretmen bir öğrencinin ya da bütün sınıfın verisini siler.

## Hedef olmayanlar

- Notlandırma, sıralama tablosu, süre ölçümü, sınav.
- Canlı (anlık) güncelleme: öğretmen tablosu açılışta ve "Yenile" ile güncellenir.
- Öğretmenin öğrenciye mesaj yazması, öğrencinin öğretmeni görmesi.
- Google ile giriş, okul hesabı entegrasyonu.
- CSV dışa aktarma (sonraya).

## Olmaması gerekenler

- **Sınıfa katılmamış hiç kimsenin sayfası dışarıya istek yapmaz.** Bugünkü "site dışarıya istek yapmaz, çevrimdışı çalışır" kuralı (`tests/pages.spec.js`) bütün örnek ve alıştırma sayfaları için aynen geçerli kalır. Dışarıya yalnızca: öğretmenin sınıf sayfası, katılma ekranı ve sınıfa katılmış öğrencinin alıştırma kontrolleri bağlanır.
- Bir öğrencinin başka bir öğrencinin verisini görmesi; öğretmenin başka öğretmenin sınıfını görmesi.
- Gerçek ad, e-posta ya da öğrenciden başka bir kişisel veri istenmesi (öğrenci yalnızca takma ad yazar).
- Gizli test kodunun ya da gizli girdilerin buluta gitmesi (bulut kaydı tarayıcıdaki deneme kaydının aynısıdır, o da bunları tutmuyor).
- Firebase'e ulaşılamadığında alıştırmanın bozulması: kontrol, ipucu, yerel geçmiş her zamanki gibi çalışır; gönderilemeyen kayıt sonra tekrar denenir.

## Kısıtlar

- Statik site (GitHub Pages), sunucu kodu yok. Dışarıdan JavaScript dosyası yüklenmez: Firebase'in kütüphanesi yerine Firebase'in **REST uç noktaları** küçük `fetch` çağrılarıyla kullanılır.
- Yapılandırma (`apiKey`, `projectId`) sayfada açıkça durur (Firebase'de bu normaldir); güvenliği **Firestore güvenlik kuralları** sağlar.
- Testler gerçek Firebase'e bağlanmaz.
- tr/en/de arayüz, telefon genişliği, koyu tema; ES5 üslubu.

## Yaklaşımlar

- **Firebase, REST ile (seçilen):** kütüphane yükü yok, sitenin "dışarıdan dosya yüklemez" kuralına uyar; bedeli, belge biçimi dönüşümünü ve oturum yenilemeyi kendimizin yazması.
- Firebase'in resmi JavaScript kütüphanesi (CDN'den ya da depoya kopyalanarak): yazması daha kolay (canlı dinleme, hazır oturum yönetimi), ama siteye yüzlerce KB'lık bir paket ve dış kaynak ekler.
- Supabase: benzer; seçilmedi (kullanıcı Firebase dedi).
- Sunucusuz kod yapıştırma: kullanıcı canlı bir sınıf istediği için seçilmedi.

## Tasarım

### Kimlik

- **Öğretmen:** Firebase Authentication, e-posta/şifre. Kayıt, giriş, "şifremi unuttum" (Firebase'in sıfırlama e-postası). Oturum, yenileme jetonuyla tarayıcıda tutulur; "Çıkış" düğmesi.
- **Öğrenci:** Firebase **anonim** oturum. Takma ad (en çok 30 karakter) öğrenci kaydında durur. Katılma bilgisi (`sınıf kodu`, `uid`, yenileme jetonu, takma ad) tarayıcıda `localStorage['dsv-class']`'ta tutulur.
- **Bilinen sınır:** öğrenci tarayıcısını temizlerse ya da başka bir cihaza geçerse yeni bir öğrenci olarak katılır (eski kaydı öğretmende ayrı bir satır olarak kalır). Hesapsız öğrencinin bedeli bu.

### Veri (Firestore)

- `classes/{kod}`: `{name, ownerUid, plan (plan bağlantısının #plan=… kısmı), createdAt}`. `kod`: 6 karakter, karışmayan harf ve rakamlardan (ör. `K7M2QX`), çakışırsa yeniden üretilir.
- `classes/{kod}/students/{uid}`: `{nick, joinedAt, updatedAt, progress: {dosya: {done, attempts}}}`.
- `classes/{kod}/students/{uid}/attempts/{otomatik}`: tarayıcıdaki deneme kaydının aynısı ve dosya adı: `{file, t, lang, code, kind, error, results}` (kod en çok 5000 karakter).
- Bölge: kullanıcı proje açarken bir Avrupa bölgesi seçer (KVKK/GDPR açısından yakın; kurulum adımlarında yazılı).

### Güvenlik kuralları (özet; tam metni depoda `firestore.rules`)

- Sınıf belgesi: oturum açmış herkes okuyabilir (öğrencinin katılırken sınıfın adını görmesi için; kişisel veri içermez). Yalnızca e-postalı (öğretmen) bir hesap, kendini sahip yazarak oluşturabilir; yalnızca sahibi değiştirir/siler.
- Öğrenci belgesi ve denemeleri: yalnızca o öğrenci (kendi `uid`'i) yazar; o öğrenci ve sınıfın sahibi okur; öğrenci ya da sahibi siler. Denemeler değiştirilemez (yalnızca eklenir/silinir).
- Alan sınırları kurallarda: takma ad ≤ 30, kod ≤ 5000 karakter, `kind` üç değerden biri.

### Öğretmen: `class.html` (yeni sayfa, menüde öğretmen bağlantısının yanında)

- Giriş/kayıt/şifre sıfırlama formu.
- "Sınıflarım" listesi (ad, kod, öğrenci sayısı).
- "Yeni sınıf": ad + plan bağlantısı (öğretmen sayfasından gelir: `teacher.html`'de "Bu planla sınıf aç" düğmesi `class.html`'e planı taşır; ya da bağlantı yapıştırılır). Sonuç: öğrencilere verilecek bağlantı `plan.html#plan=…&class=KOD` (kopyala düğmesi).
- Sınıf görünümü: satırlar öğrenciler (takma ad), sütunlar plandaki alıştırma sayfaları (`ex*.html`); hücre: ✓ (çözdü), deneme sayısı, yoksa —. Hücreye tıklayınca o öğrencinin o alıştırmadaki son denemeleri açılır (kod, karşılaştırma çizimi, hata; tarayıcıdaki geçmişle aynı görünüm). "Yenile" düğmesi.
- Silme: "Öğrenciyi sil" ve "Sınıfı ve bütün verisini sil" (onay için sınıf kodunu yazdırır). Firestore alt koleksiyonları kendiliğinden silmediği için istemci önce denemeleri, sonra öğrencileri, en son sınıfı siler.

### Öğrenci: katılma ve gönderme

- `plan.html` bağlantısında `class=KOD` varsa ve öğrenci henüz katılmamışsa: sınıfın adı, "Sınıfa katıl" kutusu (takma ad), ne gönderileceğini anlatan kısa bir not ("alıştırma sonuçların ve denemelerin öğretmenine gider; adın değil, yazdığın takma ad görünür"). Katılınca yerel ilerleme de (yalnızca plandaki alıştırmalar) bir kez gönderilir.
- Katılmış öğrencinin alıştırma sayfasında her kontrolden sonra deneme kaydı ve güncel ilerleme sınıfa yazılır. Gönderilemeyen kayıtlar `localStorage['dsv-class-queue']`'da bekler ve sonraki sayfa açılışında/kontrolde yeniden denenir. Panelde küçük bir durum yazısı: "Öğretmenine gönderildi" / "Gönderilemedi, sonra denenecek".
- Plan sayfasında "Sınıftan ayrıl" (göndermeyi durdurur; isteğe bağlı olarak "verilerimi sil").

### Yapılandırma ve kurulum

- `js/firebase-config.js`: `{apiKey, projectId}`; boşsa sınıf özelliği kapalıdır (sınıf bağlantısı "bu sitede sınıf özelliği açık değil" der, `class.html` kurulum notu gösterir).
- Depoda `firestore.rules` ve README'de kurulum adımları: Firebase konsolunda proje aç → Authentication'da e-posta/şifre ve anonim oturumu aç → Firestore'u Avrupa bölgesinde oluştur → kuralları yapıştır/yayınla → web uygulaması ekleyip `apiKey` ve `projectId`'yi `js/firebase-config.js`'e yaz.

### Testler

- Veri katmanı tek bir arayüzün arkasında (`dsvClassroom`): gerçek uygulama REST ile Firebase'e, testlerde ise tarayıcıda çalışan sahte bir uygulama (sayfa yenilense de veri kalsın diye `localStorage` üzerinde). Öğretmen ve öğrenci akışlarının uçtan uca testleri sahte uygulamayla yapılır.
- REST istemcisinin istek biçimleri (adresler, gövde, belge dönüşümü, jeton yenileme) ağ isteklerini yakalayan testlerle doğrulanır.
- Bütün mevcut sayfalarda "dışarıya istek yok" testi aynen geçmeye devam eder; sınıfa katılmış öğrenci için yalnızca Firebase adreslerine gidildiği ayrıca test edilir.
- Güvenlik kuralları için Firebase emülatörüyle test (Java ve `firebase-tools` gerektirir): mümkünse depoda bir test betiği, çalıştırılamazsa kuralların neden doğru olduğu belgede gerekçelendirilir ve kurulumdan sonra kullanıcının konsolda deneyeceği adımlar yazılır.

## Kararlaştırılanlar (kimin kararı)

- Firebase, yeni proje, öğretmen e-posta/şifre, dönem sonu silme: **kullanıcı**.
- REST ile bağlanmak (kütüphane yok), öğrenci takma ad + anonim oturum, sınıf kodunun plan bağlantısına eklenmesi, canlı değil "Yenile", çevrimdışı kuyruk, `class.html`: **benim önerim** (onaya sunulur).

## Yapıcıya kalanlar

- Sayfaların görünümü, metinlerin tam sözcükleri (tr/en/de), kod alfabesi.
- REST istemcisinin iç yapısı, belge dönüşümünün ayrıntısı.
- Yenileme jetonunun saklanma biçimi.

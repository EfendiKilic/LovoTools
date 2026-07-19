import { showToast } from '../utils.js';

/**
 * Kısayol Rehberi — Windows ve popüler geliştirici/tasarımcı programlarının
 * klavye kısayolları. Tamamen statik veri; arama, sıralama ve tıkla-kopyala destekler.
 * Veri formatı: [kısayol, ad, açıklama, popülerlik(1-5)]
 */

const PROGRAMS = {
    windows: {
        label: 'Windows',
        icon: 'ph-windows-logo',
        shortcuts: [
            ['Ctrl + C', 'Kopyala', 'Seçili öğeyi panoya kopyalar.', 5],
            ['Ctrl + X', 'Kes', 'Seçili öğeyi keser, yapıştırınca taşır.', 5],
            ['Ctrl + V', 'Yapıştır', 'Panodaki içeriği yapıştırır.', 5],
            ['Ctrl + Z', 'Geri Al', 'Son işlemi geri alır.', 5],
            ['Ctrl + Y', 'Yinele', 'Geri alınan işlemi tekrar yapar.', 4],
            ['Ctrl + A', 'Tümünü Seç', 'Sayfadaki veya klasördeki her şeyi seçer.', 5],
            ['Ctrl + S', 'Kaydet', 'Aktif belgeyi kaydeder.', 5],
            ['Ctrl + F', 'Bul', 'Arama kutusunu açar.', 5],
            ['Ctrl + P', 'Yazdır', 'Yazdırma penceresini açar.', 4],
            ['Alt + Tab', 'Uygulama Değiştir', 'Açık pencereler arasında geçiş yapar.', 5],
            ['Alt + F4', 'Pencereyi Kapat', 'Aktif uygulamayı kapatır.', 5],
            ['Win + Shift + S', 'Ekran Alıntısı', 'Ekranın seçilen bölümünün görüntüsünü alır.', 5],
            ['Win + D', 'Masaüstünü Göster', 'Tüm pencereleri küçültüp masaüstüne döner.', 4],
            ['Win + E', 'Dosya Gezgini', 'Dosya Gezgini penceresi açar.', 4],
            ['Win + L', 'Ekranı Kilitle', 'Bilgisayarı kilit ekranına alır.', 4],
            ['Win + R', 'Çalıştır', 'Çalıştır iletişim kutusunu açar.', 4],
            ['Win + V', 'Pano Geçmişi', 'Kopyalanan son öğelerin listesini açar.', 3],
            ['Win + Tab', 'Görev Görünümü', 'Tüm pencereleri ve sanal masaüstlerini gösterir.', 3],
            ['Win + I', 'Ayarlar', 'Windows Ayarlar uygulamasını açar.', 3],
            ['Win + S', 'Arama', 'Windows aramasını açar.', 3],
            ['Win + .', 'Emoji Paneli', 'Emoji ve sembol panelini açar.', 3],
            ['Win + P', 'Yansıtma Modu', 'Çoklu ekran/projeksiyon seçeneklerini açar.', 2],
            ['Win + X', 'Hızlı Menü', 'Başlat düğmesinin sağ tık menüsünü açar.', 2],
            ['Win + Ok Tuşları', 'Pencere Yasla', 'Pencereyi ekranın yarısına/köşesine yaslar.', 4],
            ['Win + Ctrl + D', 'Yeni Sanal Masaüstü', 'Yeni bir sanal masaüstü oluşturur.', 2],
            ['Win + Ctrl + ←/→', 'Masaüstü Değiştir', 'Sanal masaüstleri arasında geçiş yapar.', 2],
            ['PrtScn', 'Ekran Görüntüsü', 'Tüm ekranı panoya kopyalar.', 4],
            ['Win + PrtScn', 'Görüntüyü Kaydet', 'Ekran görüntüsünü Resimler klasörüne kaydeder.', 3],
            ['Ctrl + Shift + Esc', 'Görev Yöneticisi', 'Görev Yöneticisini doğrudan açar.', 4],
            ['Ctrl + Alt + Del', 'Güvenlik Ekranı', 'Kilitle/Oturumu kapat/Görev Yöneticisi ekranı.', 4],
            ['F2', 'Yeniden Adlandır', 'Seçili dosya veya klasörü yeniden adlandırır.', 4],
            ['F5', 'Yenile', 'Aktif pencereyi yeniler.', 4],
            ['Ctrl + Shift + N', 'Yeni Klasör', 'Dosya Gezgininde yeni klasör oluşturur.', 3],
            ['Alt + Enter', 'Özellikler', 'Seçili öğenin özellikler penceresini açar.', 2],
            ['Shift + Delete', 'Kalıcı Sil', 'Öğeyi Geri Dönüşüm Kutusuna uğratmadan siler.', 3],
            ['Win + Home', 'Diğerlerini Küçült', 'Aktif pencere hariç tümünü küçültür.', 1],
            ['Win + +', 'Büyüteç', 'Ekran büyütecini açar ve yakınlaştırır.', 1],
            ['Win + K', 'Cihaza Bağlan', 'Kablosuz ekran ve ses cihazlarına bağlanır.', 1]
        ]
    },
    vscode: {
        label: 'VS Code',
        icon: 'ph-code',
        shortcuts: [
            ['Ctrl + Shift + P', 'Komut Paleti', 'Tüm komutlara erişim sağlayan paleti açar.', 5],
            ['Ctrl + P', 'Hızlı Dosya Aç', 'Dosya adı yazarak projede dosya açar.', 5],
            ['Ctrl + `', 'Terminal', 'Entegre terminali açar/kapatır.', 5],
            ['Ctrl + /', 'Satır Yorumu', 'Seçili satırları yorum yapar/yorumdan çıkarır.', 5],
            ['Ctrl + D', 'Sonraki Eşleşme', 'Seçili kelimenin sonraki eşleşmesini de seçer.', 5],
            ['Alt + ↑/↓', 'Satırı Taşı', 'Aktif satırı yukarı/aşağı taşır.', 5],
            ['Ctrl + F', 'Bul', 'Aktif dosyada arama yapar.', 5],
            ['Ctrl + B', 'Kenar Çubuğu', 'Sol kenar çubuğunu açar/kapatır.', 4],
            ['Ctrl + Shift + L', 'Tüm Eşleşmeleri Seç', 'Seçili kelimenin tüm eşleşmelerine imleç ekler.', 4],
            ['Shift + Alt + ↑/↓', 'Satırı Kopyala', 'Aktif satırı yukarı/aşağı çoğaltır.', 4],
            ['Ctrl + Shift + K', 'Satırı Sil', 'Aktif satırı tamamen siler.', 4],
            ['Ctrl + Shift + F', 'Dosyalarda Ara', 'Tüm projede metin arar.', 4],
            ['Ctrl + H', 'Değiştir', 'Aktif dosyada bul ve değiştir.', 4],
            ['F12', 'Tanıma Git', 'Fonksiyon/değişken tanımına atlar.', 4],
            ['F2', 'Sembolü Yeniden Adlandır', 'Değişkeni tüm kullanımlarıyla birlikte yeniden adlandırır.', 4],
            ['Ctrl + Space', 'Öneri Aç', 'Kod tamamlama önerilerini tetikler.', 4],
            ['Shift + Alt + F', 'Belgeyi Biçimlendir', 'Tüm dosyayı otomatik biçimlendirir.', 4],
            ['Ctrl + .', 'Hızlı Düzeltme', 'Hata/uyarı için önerilen düzeltmeleri açar.', 4],
            ['Ctrl + W', 'Sekmeyi Kapat', 'Aktif editör sekmesini kapatır.', 4],
            ['F5', 'Hata Ayıklama', 'Debug oturumunu başlatır.', 4],
            ['Alt + Click', 'Çoklu İmleç', 'Tıklanan her yere ek imleç yerleştirir.', 4],
            ['Ctrl + Alt + ↑/↓', 'İmleç Ekle', 'Üst/alt satıra imleç ekler.', 3],
            ['Ctrl + G', 'Satıra Git', 'Belirtilen satır numarasına atlar.', 3],
            ['Ctrl + Shift + O', 'Sembole Git', 'Dosyadaki fonksiyon/sembol listesinde gezinir.', 3],
            ['Shift + F12', 'Referansları Bul', 'Sembolün kullanıldığı tüm yerleri listeler.', 3],
            ['Alt + F12', 'Tanıma Gözat', 'Tanımı satır içinde (peek) gösterir.', 3],
            ['Ctrl + Shift + H', 'Dosyalarda Değiştir', 'Tüm projede bul ve değiştir.', 3],
            ['Ctrl + \\', 'Editörü Böl', 'Editörü yan yana ikiye böler.', 3],
            ['Ctrl + Tab', 'Sekme Geçişi', 'Açık sekmeler arasında geçiş yapar.', 3],
            ['Ctrl + Shift + T', 'Sekmeyi Geri Aç', 'Son kapatılan editörü yeniden açar.', 3],
            ['Shift + Alt + A', 'Blok Yorumu', 'Seçimi blok yorumuna alır.', 3],
            ['Ctrl + Enter', 'Alta Satır Ekle', 'İmleç neredeyse olsun, altta yeni satır açar.', 3],
            ['F8', 'Sonraki Hata', 'Dosyadaki sonraki hata/uyarıya atlar.', 3],
            ['F9', 'Kesme Noktası', 'Aktif satıra breakpoint ekler/kaldırır.', 3],
            ['Ctrl + K Z', 'Zen Modu', 'Tüm panelleri gizleyip odak moduna geçer.', 2],
            ['Ctrl + K Ctrl + S', 'Kısayol Ayarları', 'Klavye kısayolları düzenleyicisini açar.', 2],
            ['Ctrl + Shift + V', 'Markdown Önizleme', 'Markdown dosyasının önizlemesini açar.', 2],
            ['Ctrl + K M', 'Dil Modu', 'Dosyanın dil modunu değiştirir.', 2]
        ]
    },
    photoshop: {
        label: 'Photoshop',
        icon: 'ph-image',
        shortcuts: [
            ['V', 'Taşıma Aracı', 'Katman ve seçimleri taşır.', 5],
            ['M', 'Seçim Çerçevesi', 'Dikdörtgen/elips seçim aracı.', 5],
            ['B', 'Fırça', 'Fırça aracını seçer.', 5],
            ['C', 'Kırpma', 'Tuvali kırpma aracını seçer.', 5],
            ['T', 'Yazı', 'Metin aracını seçer.', 5],
            ['Ctrl + T', 'Serbest Dönüştür', 'Seçimi ölçekle/döndür/eğ.', 5],
            ['Ctrl + J', 'Katmanı Çoğalt', 'Aktif katmanın kopyasını oluşturur.', 5],
            ['Ctrl + D', 'Seçimi Kaldır', 'Aktif seçimi iptal eder.', 5],
            ['Ctrl + Z', 'Geri Al', 'Son işlemi geri alır.', 5],
            ['P', 'Kalem', 'Pen aracıyla vektörel yol çizer.', 4],
            ['W', 'Hızlı Seçim', 'Hızlı seçim / sihirli değnek aracı.', 4],
            ['L', 'Kement', 'Serbest form seçim aracı.', 4],
            ['E', 'Silgi', 'Silgi aracını seçer.', 4],
            ['I', 'Damlalık', 'Tuvalden renk örnekler.', 4],
            ['Z', 'Yakınlaştır', 'Zoom aracını seçer.', 4],
            ['[ / ]', 'Fırça Boyutu', 'Fırça ucunu küçültür/büyütür.', 4],
            ['Ctrl + Shift + N', 'Yeni Katman', 'Yeni boş katman oluşturur.', 4],
            ['Ctrl + E', 'Katmanları Birleştir', 'Seçili katmanları tek katmana indirir.', 4],
            ['Ctrl + G', 'Grupla', 'Seçili katmanları gruba alır.', 4],
            ['Ctrl + Shift + I', 'Seçimi Tersine Çevir', 'Seçili olmayan alanı seçer.', 4],
            ['Ctrl + Shift + Z', 'Yinele', 'Geri alınan işlemi tekrarlar.', 4],
            ['Ctrl + L', 'Düzeyler', 'Levels ayar penceresini açar.', 4],
            ['Ctrl + M', 'Eğriler', 'Curves ayar penceresini açar.', 4],
            ['Ctrl + U', 'Ton/Doygunluk', 'Hue/Saturation penceresini açar.', 4],
            ['Alt + Backspace', 'Ön Planla Doldur', 'Seçimi ön plan rengiyle doldurur.', 4],
            ['Ctrl + 0', 'Ekrana Sığdır', 'Tuvali pencereye sığdırır.', 4],
            ['S', 'Klonlama Damgası', 'Clone Stamp aracını seçer.', 3],
            ['J', 'Nokta İyileştirme', 'Spot Healing (leke giderme) aracı.', 3],
            ['G', 'Degrade / Kova', 'Gradient veya boya kovası aracı.', 3],
            ['H', 'El Aracı', 'Tuvalde gezinme aracı.', 3],
            ['X', 'Renkleri Değiştir', 'Ön ve arka plan renklerini takas eder.', 3],
            ['D', 'Varsayılan Renkler', 'Ön/arka planı siyah-beyaza döndürür.', 3],
            ['Ctrl + Backspace', 'Arka Planla Doldur', 'Seçimi arka plan rengiyle doldurur.', 3],
            ['Ctrl + Shift + E', 'Görünenleri Birleştir', 'Tüm görünür katmanları birleştirir.', 3],
            ['Ctrl + Shift + G', 'Grubu Çöz', 'Katman grubunu dağıtır.', 3],
            ['Ctrl + Shift + U', 'Doygunluğu Kaldır', 'Görseli siyah-beyaza çevirir.', 3],
            ['Ctrl + I', 'Renkleri Tersine Çevir', 'Negatif görüntü oluşturur.', 3],
            ['Ctrl + Alt + I', 'Görüntü Boyutu', 'Görsel boyutlandırma penceresini açar.', 3],
            ['Ctrl + B', 'Renk Dengesi', 'Color Balance penceresini açar.', 3],
            ['Ctrl + R', 'Cetveller', 'Cetvelleri gösterir/gizler.', 3],
            ['Ctrl + 1', '%100 Görünüm', 'Gerçek piksel boyutuna döner.', 3],
            ['Tab', 'Panelleri Gizle', 'Tüm panelleri gizler/gösterir.', 3],
            ['O', 'Soldurma/Yakma', 'Dodge/Burn araçlarını seçer.', 2],
            ['Shift + [ / ]', 'Fırça Sertliği', 'Fırça kenar sertliğini değiştirir.', 2],
            ['F', 'Ekran Modu', 'Ekran modları arasında geçiş yapar.', 2],
            ["Ctrl + '", 'Izgara', 'Pixel ızgarasını gösterir/gizler.', 2],
            ['Ctrl + ;', 'Kılavuzlar', 'Kılavuz çizgilerini gösterir/gizler.', 2]
        ]
    },
    illustrator: {
        label: 'Illustrator',
        icon: 'ph-pen-nib',
        shortcuts: [
            ['V', 'Seçim Aracı', 'Nesneleri seçer ve taşır.', 5],
            ['A', 'Doğrudan Seçim', 'Çapa noktalarını ve yolları düzenler.', 5],
            ['P', 'Kalem', 'Pen aracıyla vektörel yol çizer.', 5],
            ['T', 'Yazı', 'Metin aracını seçer.', 5],
            ['Ctrl + G', 'Grupla', 'Seçili nesneleri gruba alır.', 5],
            ['M', 'Dikdörtgen', 'Dikdörtgen çizim aracı.', 4],
            ['L', 'Elips', 'Elips/daire çizim aracı.', 4],
            ['I', 'Damlalık', 'Renk ve stil örnekler.', 4],
            ['Ctrl + Shift + G', 'Grubu Çöz', 'Grubu dağıtır.', 4],
            ['Ctrl + 7', 'Kırpma Maskesi', 'Seçimden kırpma maskesi oluşturur.', 4],
            ['Ctrl + Shift + O', 'Yazıyı Çizime Çevir', 'Metni vektörel anahatlara dönüştürür.', 4],
            ['Shift + M', 'Şekil Oluşturucu', 'Şekilleri birleştirip bölen Shape Builder aracı.', 3],
            ['B', 'Boya Fırçası', 'Paintbrush aracını seçer.', 3],
            ['G', 'Degrade', 'Gradient aracını seçer.', 3],
            ['R', 'Döndür', 'Rotate aracını seçer.', 3],
            ['S', 'Ölçekle', 'Scale aracını seçer.', 3],
            ['E', 'Serbest Dönüştür', 'Free Transform aracını seçer.', 3],
            ['Ctrl + 2', 'Kilitle', 'Seçili nesneyi kilitler.', 3],
            ['Ctrl + Alt + 2', 'Kilitleri Aç', 'Tüm kilitli nesneleri açar.', 3],
            ['Ctrl + F', 'Öne Yapıştır', 'Kopyayı aynı konumda öne yapıştırır.', 3],
            ['Ctrl + B', 'Arkaya Yapıştır', 'Kopyayı aynı konumda arkaya yapıştırır.', 3],
            ['Ctrl + D', 'Dönüşümü Tekrarla', 'Son dönüştürme işlemini yineler.', 3],
            ['Ctrl + 8', 'Bileşik Yol', 'Seçimden compound path oluşturur.', 3],
            ['Ctrl + J', 'Yolları Birleştir', 'Açık uçlu çapa noktalarını birleştirir.', 3],
            ['Ctrl + [ / ]', 'Bir Alta/Üste', 'Nesneyi katman sırasında taşır.', 3],
            ['Ctrl + Shift + [ / ]', 'En Alta/Üste', 'Nesneyi en alta veya en üste gönderir.', 3],
            ['Ctrl + R', 'Cetveller', 'Cetvelleri gösterir/gizler.', 3],
            ['Ctrl + Y', 'Anahat Görünümü', 'Outline/Preview modları arasında geçiş.', 3],
            ['Ctrl + 0', 'Ekrana Sığdır', 'Çalışma yüzeyini pencereye sığdırır.', 3],
            ['Q', 'Kement', 'Serbest seçim aracı.', 2],
            ['C', 'Makas', 'Yolları keser.', 2],
            ['Shift + C', 'Çapa Noktası', 'Çapa noktalarını yumuşatır/keskinleştirir.', 2],
            ['K', 'Canlı Boya Kovası', 'Live Paint bölgelerini boyar.', 2],
            ['Ctrl + 3', 'Gizle', 'Seçili nesneyi gizler.', 2],
            ['Ctrl + Alt + 3', 'Tümünü Göster', 'Gizlenen nesneleri geri getirir.', 2],
            ['Ctrl + U', 'Akıllı Kılavuzlar', 'Smart Guides özelliğini açar/kapatır.', 2],
            ['Shift + Ctrl + P', 'Yerleştir', 'Dosya yerleştirme (Place) penceresini açar.', 2]
        ]
    },
    figma: {
        label: 'Figma',
        icon: 'ph-figma-logo',
        shortcuts: [
            ['V', 'Taşıma Aracı', 'Katmanları seçer ve taşır.', 5],
            ['F', 'Frame', 'Frame (çerçeve) çizim aracı.', 5],
            ['R', 'Dikdörtgen', 'Dikdörtgen çizim aracı.', 5],
            ['T', 'Yazı', 'Metin aracını seçer.', 5],
            ['P', 'Kalem', 'Vektörel yol çizim aracı.', 4],
            ['O', 'Elips', 'Elips/daire çizim aracı.', 4],
            ['Shift + A', 'Auto Layout', 'Seçime otomatik yerleşim ekler.', 4],
            ['Ctrl + D', 'Çoğalt', 'Seçili öğeyi kopyalar.', 4],
            ['Ctrl + G', 'Grupla', 'Seçimi gruba alır.', 4],
            ['Ctrl + Alt + G', "Frame'e Al", 'Seçimi bir frame içine sarar.', 4],
            ['Ctrl + Alt + K', 'Bileşen Oluştur', 'Seçimden component oluşturur.', 4],
            ['Alt + Sürükle', 'Kopyalayarak Taşı', 'Öğenin kopyasını sürükleyerek oluşturur.', 4],
            ['Alt (basılı tut)', 'Mesafe Ölç', 'Öğeler arası boşlukları gösterir.', 4],
            ['K', 'Ölçekleme', 'Scale aracıyla oranlı boyutlandırır.', 3],
            ['C', 'Yorum', 'Yorum ekleme moduna geçer.', 3],
            ['L', 'Çizgi', 'Çizgi çizim aracı.', 3],
            ['I', 'Renk Seçici', 'Ekrandan renk örnekler.', 3],
            ['Ctrl + Shift + G', 'Grubu Çöz', 'Grubu veya frame içeriğini dağıtır.', 3],
            ['Ctrl + Alt + B', "Instance'ı Ayır", "Component bağlantısını koparır (detach).", 3],
            ['Ctrl + Shift + E', 'Dışa Aktar', 'Export panelini açar.', 3],
            ['Ctrl + /', 'Hızlı İşlemler', 'Komut arama çubuğunu açar.', 3],
            ['Shift + 1', 'Ekrana Sığdır', 'Tüm içeriği pencereye sığdırır.', 3],
            ['Shift + 0', '%100 Görünüm', 'Gerçek boyuta yakınlaştırır.', 3],
            ['Space + Sürükle', 'Tuvalde Gezin', 'El aracıyla tuvali kaydırır.', 3],
            ['Ctrl + R', 'Yeniden Adlandır', 'Seçili katmanları toplu yeniden adlandırır.', 2],
            ['Ctrl + Shift + H', 'Gizle/Göster', 'Seçili katmanın görünürlüğünü değiştirir.', 2],
            ['Ctrl + Shift + L', 'Kilitle', 'Seçili katmanı kilitler/açar.', 2],
            ['Ctrl + E', 'Düzleştir', 'Seçili vektörleri tek şekle indirir (flatten).', 2],
            ['Ctrl + \\', 'Arayüzü Gizle', 'Panelleri gizleyip tuvale odaklanır.', 2]
        ]
    },
    chrome: {
        label: 'Chrome',
        icon: 'ph-google-chrome-logo',
        shortcuts: [
            ['Ctrl + T', 'Yeni Sekme', 'Yeni bir sekme açar.', 5],
            ['Ctrl + W', 'Sekmeyi Kapat', 'Aktif sekmeyi kapatır.', 5],
            ['Ctrl + Shift + T', 'Sekmeyi Geri Aç', 'Son kapatılan sekmeyi yeniden açar.', 5],
            ['F12', 'Geliştirici Araçları', 'DevTools panelini açar.', 5],
            ['Ctrl + Tab', 'Sonraki Sekme', 'Sağdaki sekmeye geçer.', 4],
            ['Ctrl + L', 'Adres Çubuğu', 'İmleci adres çubuğuna taşır.', 4],
            ['Ctrl + N', 'Yeni Pencere', 'Yeni tarayıcı penceresi açar.', 4],
            ['Ctrl + Shift + N', 'Gizli Pencere', 'Gizli (incognito) pencere açar.', 4],
            ['Ctrl + D', 'Yer İmi Ekle', 'Aktif sayfayı yer imlerine ekler.', 4],
            ['Ctrl + F', 'Sayfada Bul', 'Sayfa içinde metin arar.', 4],
            ['Ctrl + R', 'Yenile', 'Sayfayı yeniler.', 4],
            ['Ctrl + Shift + R', 'Tam Yenile', 'Önbelleği atlayarak sayfayı yeniler.', 4],
            ['Ctrl + Shift + I', 'Öğeleri İncele', 'DevTools Elements panelini açar.', 4],
            ['Ctrl + Shift + J', 'Konsol', 'DevTools JavaScript konsolunu açar.', 4],
            ['Ctrl + Shift + C', 'Öğe Seçici', 'Tıklanan öğeyi DevTools ile inceler.', 4],
            ['Ctrl + Shift + Tab', 'Önceki Sekme', 'Soldaki sekmeye geçer.', 3],
            ['Ctrl + 1…8', 'Sekmeye Git', 'Numarasına göre sekmeye atlar.', 3],
            ['Ctrl + H', 'Geçmiş', 'Tarama geçmişini açar.', 3],
            ['Ctrl + J', 'İndirilenler', 'İndirilenler sayfasını açar.', 3],
            ['Ctrl + + / -', 'Yakınlaştır', 'Sayfayı büyütür/küçültür.', 3],
            ['Ctrl + 0', 'Zoom Sıfırla', 'Yakınlaştırmayı %100 yapar.', 3],
            ['F11', 'Tam Ekran', 'Tam ekran moduna geçer.', 3],
            ['Ctrl + U', 'Kaynak Kodu', 'Sayfanın kaynak kodunu gösterir.', 3],
            ['Ctrl + Shift + Delete', 'Verileri Temizle', 'Tarama verilerini silme penceresini açar.', 3],
            ['Alt + ←', 'Geri', 'Önceki sayfaya döner.', 3],
            ['Ctrl + Shift + B', 'Yer İmi Çubuğu', 'Yer imleri çubuğunu gösterir/gizler.', 3],
            ['Ctrl + 9', 'Son Sekme', 'En sağdaki sekmeye atlar.', 2],
            ['Space / Shift + Space', 'Sayfa Kaydır', 'Bir ekran boyu aşağı/yukarı kaydırır.', 2]
        ]
    },
    excel: {
        label: 'Excel',
        icon: 'ph-microsoft-excel-logo',
        shortcuts: [
            ['F2', 'Hücreyi Düzenle', 'Aktif hücreyi düzenleme moduna alır.', 5],
            ['Ctrl + Z', 'Geri Al', 'Son işlemi geri alır.', 5],
            ['Ctrl + S', 'Kaydet', 'Çalışma kitabını kaydeder.', 5],
            ['F4', 'Başvuru Sabitle', 'Formülde $ sabitleme ekler / son işlemi tekrarlar.', 4],
            ['Ctrl + Ok Tuşları', 'Veri Sonuna Git', 'Dolu aralığın kenarına atlar.', 4],
            ['Ctrl + Shift + Ok', 'Seçerek Git', 'Veri sonuna kadar seçim yapar.', 4],
            ['Alt + =', 'Otomatik Toplam', 'Seçime SUM formülü ekler.', 4],
            ['Ctrl + 1', 'Hücre Biçimlendir', 'Biçimlendirme penceresini açar.', 4],
            ['Ctrl + Shift + L', 'Filtre', 'Başlık satırına filtre ekler/kaldırır.', 4],
            ['Alt + Enter', 'Hücre İçi Satır', 'Aynı hücrede yeni satıra geçer.', 4],
            ['Ctrl + T', 'Tablo Oluştur', 'Seçimi biçimli tabloya çevirir.', 4],
            ['Ctrl + F', 'Bul', 'Arama penceresini açar.', 4],
            ['Ctrl + H', 'Değiştir', 'Bul ve değiştir penceresini açar.', 4],
            ['Ctrl + B', 'Kalın', 'Seçimi kalın yapar.', 4],
            ['Ctrl + Enter', 'Toplu Doldur', 'Aynı değeri tüm seçili hücrelere yazar.', 3],
            ['Ctrl + D', 'Aşağı Doldur', 'Üstteki hücrenin içeriğini kopyalar.', 3],
            ['Ctrl + ;', 'Bugünün Tarihi', 'Aktif hücreye günün tarihini yazar.', 3],
            ['Ctrl + Space', 'Sütunu Seç', 'Aktif sütunun tamamını seçer.', 3],
            ['Shift + Space', 'Satırı Seç', 'Aktif satırın tamamını seçer.', 3],
            ['Ctrl + PgUp/PgDn', 'Sayfa Değiştir', 'Çalışma sayfaları arasında geçiş yapar.', 3],
            ['Ctrl + Shift + +', 'Ekle', 'Satır/sütun/hücre ekler.', 3],
            ['Ctrl + -', 'Sil', 'Satır/sütun/hücre siler.', 3],
            ['Ctrl + R', 'Sağa Doldur', 'Soldaki hücrenin içeriğini kopyalar.', 2],
            ['Ctrl + Shift + ;', 'Şu Anki Saat', 'Aktif hücreye saati yazar.', 2],
            ['Ctrl + 9', 'Satırı Gizle', 'Seçili satırları gizler.', 2],
            ['Ctrl + 0', 'Sütunu Gizle', 'Seçili sütunları gizler.', 2],
            ['Ctrl + K', 'Köprü', 'Hücreye bağlantı ekler.', 2],
            ['F9', 'Yeniden Hesapla', 'Tüm formülleri yeniden hesaplar.', 2],
            ['Ctrl + `', 'Formülleri Göster', 'Hücrelerde formülleri görüntüler.', 2]
        ]
    },
    word: {
        label: 'Word',
        icon: 'ph-microsoft-word-logo',
        shortcuts: [
            ['Ctrl + B', 'Kalın', 'Seçili metni kalın yapar.', 5],
            ['Ctrl + I', 'İtalik', 'Seçili metni eğik yapar.', 5],
            ['Ctrl + U', 'Altı Çizili', 'Seçili metnin altını çizer.', 5],
            ['Ctrl + S', 'Kaydet', 'Belgeyi kaydeder.', 5],
            ['Ctrl + F', 'Bul', 'Belge içinde arama yapar.', 5],
            ['Ctrl + P', 'Yazdır', 'Yazdırma ekranını açar.', 4],
            ['Ctrl + N', 'Yeni Belge', 'Boş bir belge açar.', 4],
            ['Ctrl + H', 'Değiştir', 'Bul ve değiştir penceresini açar.', 4],
            ['Ctrl + E', 'Ortala', 'Paragrafı ortaya hizalar.', 4],
            ['Ctrl + Enter', 'Sayfa Sonu', 'İmleçten itibaren yeni sayfaya geçer.', 4],
            ['Shift + F3', 'Harf Değiştir', 'Büyük/küçük harf biçimleri arasında geçiş yapar.', 4],
            ['F12', 'Farklı Kaydet', 'Farklı kaydet penceresini açar.', 4],
            ['Ctrl + L', 'Sola Hizala', 'Paragrafı sola yaslar.', 3],
            ['Ctrl + R', 'Sağa Hizala', 'Paragrafı sağa yaslar.', 3],
            ['Ctrl + J', 'İki Yana Yasla', 'Paragrafı iki yana yaslar.', 3],
            ['Ctrl + K', 'Köprü', 'Seçili metne bağlantı ekler.', 3],
            ['Ctrl + D', 'Yazı Tipi', 'Yazı tipi ayarları penceresini açar.', 3],
            ['Ctrl + Shift + C', 'Biçim Kopyala', 'Seçimin biçimlendirmesini kopyalar.', 3],
            ['Ctrl + Shift + V', 'Biçim Yapıştır', 'Kopyalanan biçimi uygular.', 3],
            ['Ctrl + ←/→', 'Kelime Atla', 'İmleci kelime kelime hareket ettirir.', 3],
            ['Ctrl + Shift + ←/→', 'Kelime Seç', 'Kelime kelime seçim yapar.', 3],
            ['Ctrl + Home/End', 'Belge Başı/Sonu', 'Belgenin başına veya sonuna atlar.', 3],
            ['Ctrl + Backspace', 'Kelime Sil', 'İmlecin solundaki kelimeyi siler.', 3],
            ['Ctrl + Alt + 1/2/3', 'Başlık Stili', 'Başlık 1/2/3 stilini uygular.', 3],
            ['F7', 'Yazım Denetimi', 'Yazım ve dil bilgisi denetimini başlatır.', 3],
            ['Ctrl + W', 'Belgeyi Kapat', 'Aktif belgeyi kapatır.', 3],
            ['Ctrl + 1 / 2 / 5', 'Satır Aralığı', 'Tek, çift veya 1,5 satır aralığı uygular.', 2],
            ['Ctrl + Shift + N', 'Normal Stil', 'Seçimi normal metin stiline döndürür.', 2],
            ['Ctrl + = / Ctrl + Shift + =', 'Alt/Üst Simge', 'Alt simge veya üst simge biçimi uygular.', 2],
            ['Ctrl + Shift + 8', 'Paragraf İşaretleri', 'Gizli biçim işaretlerini gösterir/gizler.', 2],
            ['Ctrl + Alt + M', 'Yorum Ekle', 'Seçime yeni yorum ekler.', 2]
        ]
    },
    powerpoint: {
        label: 'PowerPoint',
        icon: 'ph-microsoft-powerpoint-logo',
        shortcuts: [
            ['F5', 'Sunumu Başlat', 'Sunumu baştan oynatır.', 5],
            ['Shift + F5', 'Buradan Başlat', 'Sunumu geçerli slayttan oynatır.', 5],
            ['Ctrl + M', 'Yeni Slayt', 'Yeni slayt ekler.', 5],
            ['Esc', 'Sunumdan Çık', 'Slayt gösterisini sonlandırır.', 4],
            ['Ctrl + D', 'Çoğalt', 'Seçili slaydı veya nesneyi kopyalar.', 4],
            ['Ctrl + G', 'Grupla', 'Seçili nesneleri gruba alır.', 4],
            ['Ctrl + B', 'Kalın', 'Seçili metni kalın yapar.', 4],
            ['Ctrl + Shift + > / <', 'Yazı Boyutu', 'Seçili metni büyütür/küçültür.', 4],
            ['Ctrl + Z', 'Geri Al', 'Son işlemi geri alır.', 4],
            ['Ctrl + A', 'Tümünü Seç', 'Slayttaki tüm nesneleri seçer.', 4],
            ['Ctrl + Shift + G', 'Grubu Çöz', 'Nesne grubunu dağıtır.', 3],
            ['Tab / Shift + Tab', 'Madde Seviyesi', 'Liste öğesinin girinti seviyesini değiştirir.', 3],
            ['Ctrl + E / L / R', 'Hizalama', 'Metni ortaya/sola/sağa hizalar.', 3],
            ['Ctrl + K', 'Köprü', 'Seçime bağlantı ekler.', 3],
            ['Ctrl + Shift + C', 'Biçim Kopyala', 'Nesnenin biçimlendirmesini kopyalar.', 3],
            ['Ctrl + Shift + V', 'Biçim Yapıştır', 'Kopyalanan biçimi uygular.', 3],
            ['Shift + F3', 'Harf Değiştir', 'Büyük/küçük harf biçimleri arasında geçiş yapar.', 3],
            ['Ctrl + F', 'Bul', 'Sunum içinde arama yapar.', 3],
            ['F12', 'Farklı Kaydet', 'Farklı kaydet penceresini açar.', 3],
            ['B', 'Siyah Ekran', 'Sunum sırasında ekranı karartır.', 3],
            ['Numara + Enter', 'Slayta Git', 'Sunum sırasında numarası girilen slayta atlar.', 2],
            ['W', 'Beyaz Ekran', 'Sunum sırasında ekranı beyazlatır.', 2],
            ['Ctrl + P', 'Kalem', 'Sunum sırasında kalem imlecine geçer.', 2],
            ['E', 'Çizimleri Sil', 'Sunum sırasında kalem izlerini temizler.', 1]
        ]
    },
    outlook: {
        label: 'Outlook',
        icon: 'ph-microsoft-outlook-logo',
        shortcuts: [
            ['Ctrl + N', 'Yeni E-posta', 'Yeni ileti penceresi açar.', 5],
            ['Ctrl + R', 'Yanıtla', 'Seçili iletiyi yanıtlar.', 5],
            ['Ctrl + Enter', 'Gönder', 'Yazılan iletiyi gönderir.', 4],
            ['Ctrl + Shift + R', 'Tümünü Yanıtla', 'İletiyi tüm alıcılara yanıtlar.', 4],
            ['Ctrl + F', 'İlet', 'Seçili iletiyi başkasına iletir.', 4],
            ['Ctrl + E', 'Ara', 'Posta arama kutusuna odaklanır.', 4],
            ['Delete', 'Sil', 'Seçili iletiyi silinmiş öğelere taşır.', 4],
            ['Ctrl + 1', 'Posta', 'Posta görünümüne geçer.', 3],
            ['Ctrl + 2', 'Takvim', 'Takvim görünümüne geçer.', 3],
            ['Ctrl + Q', 'Okundu İşaretle', 'Seçili iletiyi okundu yapar.', 3],
            ['Ctrl + U', 'Okunmadı İşaretle', 'Seçili iletiyi okunmadı yapar.', 3],
            ['Ctrl + Shift + M', 'Yeni İleti', 'Hangi görünümde olursanız olun yeni ileti açar.', 3],
            ['Ctrl + Shift + A', 'Yeni Randevu', 'Takvime yeni randevu ekler.', 3],
            ['Ctrl + Shift + V', 'Klasöre Taşı', 'Seçili iletiyi klasöre taşıma penceresini açar.', 3],
            ['Alt + S', 'Gönder (Alternatif)', 'Açık iletiyi gönderir.', 3],
            ['F9', 'Gönder/Al', 'Tüm hesaplarda e-postaları eşitler.', 3],
            ['Ctrl + 3', 'Kişiler', 'Kişiler görünümüne geçer.', 2],
            ['Ctrl + 4', 'Görevler', 'Görevler görünümüne geçer.', 2],
            ['Ctrl + Shift + K', 'Yeni Görev', 'Yeni görev oluşturur.', 2],
            ['Ctrl + Shift + G', 'Bayrak Ekle', 'İletiye özel izleme bayrağı ekler.', 2],
            ['Ctrl + . / Ctrl + ,', 'Sonraki/Önceki', 'Açık iletiden sonraki/önceki iletiye geçer.', 2]
        ]
    }
};

export function initShortcutGuide() {
    const panel = document.getElementById('shortcut-guide-panel');
    if (!panel) return;

    const pillsEl = document.getElementById('sck-pills');
    const searchInput = document.getElementById('sck-search');
    const sortSelect = document.getElementById('sck-sort');
    const listEl = document.getElementById('sck-list');
    const countEl = document.getElementById('sck-count');

    let activeProgram = 'windows';

    /* --- Program sekmeleri --- */
    const allPill = document.createElement('button');
    allPill.className = 'sck-pill';
    allPill.dataset.program = 'all';
    allPill.innerHTML = '<i class="ph ph-squares-four"></i> Tümü';
    pillsEl.appendChild(allPill);

    for (const [id, prog] of Object.entries(PROGRAMS)) {
        const pill = document.createElement('button');
        pill.className = 'sck-pill' + (id === activeProgram ? ' active' : '');
        pill.dataset.program = id;
        pill.innerHTML = `<i class="ph ${prog.icon}"></i> ${prog.label}`;
        pillsEl.appendChild(pill);
    }

    pillsEl.addEventListener('click', (e) => {
        const pill = e.target.closest('.sck-pill');
        if (!pill) return;
        activeProgram = pill.dataset.program;
        pillsEl.querySelectorAll('.sck-pill').forEach(p => p.classList.toggle('active', p === pill));
        render();
    });

    searchInput.addEventListener('input', render);
    sortSelect.addEventListener('change', render);

    /* --- Liste --- */
    function collectRows() {
        const programs = activeProgram === 'all' ? Object.keys(PROGRAMS) : [activeProgram];
        const rows = [];
        for (const id of programs) {
            for (const [keys, name, desc, pop] of PROGRAMS[id].shortcuts) {
                rows.push({ program: id, keys, name, desc, pop });
            }
        }
        return rows;
    }

    function render() {
        const query = searchInput.value.trim().toLowerCase();
        let rows = collectRows();

        if (query) {
            rows = rows.filter(r =>
                r.keys.toLowerCase().includes(query) ||
                r.name.toLowerCase().includes(query) ||
                r.desc.toLowerCase().includes(query)
            );
        }

        const sort = sortSelect.value;
        if (sort === 'popular') rows.sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name, 'tr'));
        else if (sort === 'least') rows.sort((a, b) => a.pop - b.pop || a.name.localeCompare(b.name, 'tr'));
        else if (sort === 'az') rows.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        else if (sort === 'key') rows.sort((a, b) => a.keys.localeCompare(b.keys, 'tr'));

        countEl.textContent = `${rows.length} kısayol`;

        listEl.innerHTML = rows.map(r => `
            <div class="sck-row" data-keys="${r.keys.replace(/"/g, '&quot;')}" title="Kopyalamak için tıklayın">
                <div class="sck-keys">${r.keys.split(' + ').map(k => `<kbd>${k}</kbd>`).join('<span class="sck-plus">+</span>')}</div>
                <div class="sck-info">
                    <strong>${r.name}${activeProgram === 'all' ? ` <span class="sck-badge">${PROGRAMS[r.program].label}</span>` : ''}</strong>
                    <span>${r.desc}</span>
                </div>
                <div class="sck-pop" title="Kullanım sıklığı: ${r.pop}/5">
                    ${'<i class="ph-fill ph-circle"></i>'.repeat(r.pop)}${'<i class="ph ph-circle"></i>'.repeat(5 - r.pop)}
                </div>
            </div>`).join('') ||
            '<p class="sck-empty">Aramanızla eşleşen kısayol bulunamadı.</p>';
    }

    /* --- Tıkla-kopyala --- */
    listEl.addEventListener('click', (e) => {
        const row = e.target.closest('.sck-row');
        if (!row) return;
        navigator.clipboard.writeText(row.dataset.keys)
            .then(() => showToast(`"${row.dataset.keys}" kopyalandı!`, 'success'))
            .catch(() => showToast('Kopyalama başarısız oldu.', 'error'));
    });

    render();
}

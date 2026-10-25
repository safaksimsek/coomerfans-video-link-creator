(async function() {
    console.log("[1/4] Sayfalar sırayla taranmaya başlanıyor...");

    const delay = ms => new Promise(res => setTimeout(res, ms));
    const postUrls = new Set();
    
    // Bulunduğumuz ilk sayfanın adresinden başlıyoruz
    let nextPageUrl = window.location.href;
    let pageCount = 1;

    // "next" butonu olduğu sürece döngü devam eder
    while (nextPageUrl) {
        console.log(`-> Sayfa ${pageCount} taranıyor: ${nextPageUrl}`);
        
        try {
            let doc = document;
            
            // Eğer ilk sayfa değilse, o sayfayı fetch ile çekip parse ediyoruz
            if (pageCount > 1) {
                const response = await fetch(nextPageUrl);
                const html = await response.text();
                const parser = new DOMParser();
                doc = parser.parseFromString(html, 'text/html');
            }

            // O sayfadaki tüm gönderi (post) linklerini bul
            const postElements = Array.from(doc.querySelectorAll('a[href*="/p/"]'));
            let addedCount = 0;
            
            postElements.forEach(el => {
                if (el.href && !postUrls.has(el.href)) {
                    postUrls.add(el.href);
                    addedCount++;
                }
            });
            console.log(`   -> Bu sayfadan ${addedCount} yeni gönderi eklendi. (Toplam Gönderi: ${postUrls.size})`);

            // Ekrandaki yapınıza uygun olarak "next" sınıfına sahip bağlantıyı arıyoruz
            const nextBtn = doc.querySelector('a.next');
            
            if (nextBtn && nextBtn.getAttribute('href')) {
                const hrefAttr = nextBtn.getAttribute('href');
                // Göreceli URL'yi tam URL'ye çevir (örn: /u/... -> https://coomerfans.com/u/...)
                nextPageUrl = new URL(hrefAttr, window.location.origin).href;
                pageCount++;
                await delay(1000); // Sunucuyu yormamak için kısa bekleme
            } else {
                console.log("-> Başka 'next' sayfası kalmadı. Sayfa taraması tamamlandı.");
                nextPageUrl = null; // Döngüyü sonlandır
            }

        } catch (err) {
            console.error(`Sayfa taranırken hata oluştu (${nextPageUrl}):`, err.message);
            break;
        }
    }

    if (postUrls.size === 0) {
        console.error("Hata: Hiçbir gönderi bulunamadı.");
        return;
    }

    console.log(`\n[2/4] Toplam ${pageCount} sayfa bitti. Toplam ${postUrls.size} adet gönderi bulundu. Medyalar ayıklanıyor...`);

    const iframe = document.createElement('iframe');
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const mediaUrls = new Set();
    const postUrlArray = Array.from(postUrls);

    for (let i = 0; i < postUrlArray.length; i++) {
        const postUrl = postUrlArray[i];
        console.log(`(${i + 1}/${postUrlArray.length}) Gönderi açılıyor: ${postUrl}`);

        try {
            iframe.src = postUrl;
            await delay(2000); // İç sayfanın tam yüklenmesi için bekleme

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) continue;

            // 1. Resimler
            const imgs = iframeDoc.querySelectorAll('.post-body img, .post__files img');
            imgs.forEach(img => { if (img.src) mediaUrls.add(img.src); });

            // 2. Videolar (<source> etiketleri)
            const sources = iframeDoc.querySelectorAll('video source, .player source, .post-body source');
            sources.forEach(source => { if (source.src) mediaUrls.add(source.src); });

            // 3. Dosya indirme linkleri
            const links = iframeDoc.querySelectorAll('.post__files a, .post-body a');
            links.forEach(a => {
                if (a.href && (a.href.includes('storage') || a.href.includes('/data/'))) {
                    mediaUrls.add(a.href);
                }
            });

        } catch (err) {
            console.error(`   -> Gönderi taranırken hata:`, err.message);
        }

        await delay(800);
    }

    document.body.removeChild(iframe);

    if (mediaUrls.size === 0) {
        console.error("Hiçbir medya bağlantısı bulunamadı!");
        return;
    }

    console.log(`\n[3/4] Toplam ${mediaUrls.size} adet benzersiz medya linki toplandı. TXT dosyası oluşturuluyor...`);

    const textContent = Array.from(mediaUrls).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const blobUrl = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = 'coomer_tum_sayfalar_eksiksiz.txt';
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);

    console.log("\n[4/4 Tamamlandı] 'coomer_tum_sayfalar_eksiksiz.txt' dosyası bilgisayarınıza indirildi!");
})();

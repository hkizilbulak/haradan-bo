export type CommunicationChannel = 'PHONE' | 'WHATSAPP' | 'SOCIAL_MEDIA' | 'EMAIL';
export type CommunicationTopic = 'INTRO' | 'MEMBERSHIP' | 'SPONSORSHIP' | 'FOLLOWUP';

export interface CommunicationTemplate {
    channel: CommunicationChannel;
    topic: CommunicationTopic;
    template: string;
    subject?: string;
}

export const COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
    // Telefon Görüşmesi
    {
        channel: 'PHONE',
        topic: 'INTRO',
        template: `Merhabalar {person_name}, Haradan.com platformundan arıyorum. {stud_name} bünyesindeki değerli safkanlarınızı ve güncel satış ilanlarınızı takip ediyoruz.\n\n[Görüşme Notları]\n- Platformumuzun Türkiye'nin yeni nesil at pazaryeri olduğunu belirtin.\n- Haraya özel vitrin özelliklerinden bahsedin.\n- İtiraz gelirse: "Ücretsiz profil oluşturarak test edebilirsiniz" seçeneğini sunun.`,
    },
    {
        channel: 'PHONE',
        topic: 'MEMBERSHIP',
        template: `Merhabalar {person_name}, Haradan.com ekibinden arıyorum. {stud_name} için sunduğumuz özel üyelik paketleri ve avantajları hakkında bilgi vermek isterim.\n\n[Görüşme Notları]\n- Üyelik paketlerinin listeleme avantajlarını vurgulayın.\n- Özel müşteri temsilcisi desteğinden bahsedin.`,
    },
    {
        channel: 'PHONE',
        topic: 'SPONSORSHIP',
        template: `Merhabalar {person_name}, ben Haradan.com'dan arıyorum. {stud_name} ile özel bir iş birliği ve sponsorluk fırsatını değerlendirmek isteriz.\n\n[Görüşme Notları]\n- Sponsorluğun sağlayacağı ekstra görünürlüğü anlatın.\n- Sosyal medya ortak paylaşımlarından bahsedin.`,
    },
    {
        channel: 'PHONE',
        topic: 'FOLLOWUP',
        template: `Merhabalar {person_name}, Haradan.com'dan arıyorum. Daha önce {stud_name} profiliniz hakkında konuşmuştuk, güncel durumunuzu sormak istedim.\n\n[Görüşme Notları]\n- Önceki görüşmeye atıf yapın.\n- Yardıma ihtiyaçları olup olmadığını sorun.`,
    },
    
    // WhatsApp / SMS
    {
        channel: 'WHATSAPP',
        topic: 'INTRO',
        template: `Merhabalar {person_name}, Haradan.com ekibinden ulaşıyorum. {stud_name} için hazırladığımız dijital ilan ve haralara özel vitrin avantajlarımız hakkında bilgi vermek isteriz. Detaylı bilgi için ne zaman görüşebiliriz?`,
    },
    {
        channel: 'WHATSAPP',
        topic: 'MEMBERSHIP',
        template: `Merhabalar {person_name}, Haradan.com ekibinden ulaşıyorum. {stud_name} için avantajlı üyelik paketlerimiz güncellendi. İlanlarınızı öne çıkarmak için bu fırsatları incelemek ister misiniz?`,
    },
    {
        channel: 'WHATSAPP',
        topic: 'SPONSORSHIP',
        template: `Merhabalar {person_name}, Haradan.com ekibinden ulaşıyorum. {stud_name} markasına değer katacak özel sponsorluk paketlerimiz hakkında size kısa bir sunum iletebilir miyim?`,
    },
    {
        channel: 'WHATSAPP',
        topic: 'FOLLOWUP',
        template: `Merhabalar {person_name}, umarım iyisinizdir. {stud_name} ilanlarınızla ilgili Haradan.com üzerinden yardımcı olabileceğimiz bir konu var mıdır?`,
    },

    // Sosyal Medya DM
    {
        channel: 'SOCIAL_MEDIA',
        topic: 'INTRO',
        template: `Merhabalar {person_name}, {stud_name} paylaşımlarınızı ilgiyle takip ediyoruz. Türkiye'nin yeni nesil at pazaryeri Haradan.com'da haranıza özel ücretsiz profil oluşturmak ister misiniz? Link üzerinden hemen kayıt olabilirsiniz: https://haradan.com`,
    },
    {
        channel: 'SOCIAL_MEDIA',
        topic: 'MEMBERSHIP',
        template: `Merhabalar {person_name}, {stud_name} safkanları gerçekten çok etkileyici! Haradan.com premium üyelik paketleriyle bu güzellikleri binlerce alıcıya ulaştırabilirsiniz. Detayları incelemek ister misiniz?`,
    },
    {
        channel: 'SOCIAL_MEDIA',
        topic: 'SPONSORSHIP',
        template: `Merhabalar {person_name}, {stud_name} sosyal medyadaki duruşunuz harika. Haradan.com olarak sizinle bir iş birliği yapmaktan mutluluk duyarız. Detayları görüşebilir miyiz?`,
    },
    {
        channel: 'SOCIAL_MEDIA',
        topic: 'FOLLOWUP',
        template: `Merhabalar {person_name}, geçen günkü sohbetimiz sonrası {stud_name} profilinizi tamamlamak için yardıma ihtiyacınız olursa buradayız. İyi günler dileriz!`,
    },

    // E-Posta
    {
        channel: 'EMAIL',
        topic: 'INTRO',
        subject: `{stud_name} için Haradan.com İş Birliği ve Dijital Vitrin Daveti`,
        template: `Sayın {person_name},\n\nTürkiye'nin yenilikçi at ve hara pazaryeri platformu Haradan.com olarak {stud_name} bünyesindeki başarılı çalışmalarınızı yakından takip ediyoruz.\n\nPlatformumuzda haranıza özel oluşturacağımız ücretsiz dijital vitrin ile, güncel satış ilanlarınızı ve aygırlarınızı doğrudan doğru alıcı kitlesine ulaştırabilirsiniz.\n\nKonuyla ilgili size daha detaylı bilgi verebilmemiz için kısa bir telefon görüşmesi ayarlayabilir miyiz?\n\nSaygılarımızla,\nHaradan.com Ekibi`,
    },
    {
        channel: 'EMAIL',
        topic: 'MEMBERSHIP',
        subject: `{stud_name} için Haradan.com Üyelik Avantajları`,
        template: `Sayın {person_name},\n\nHaradan.com platformunda {stud_name} ilanlarınızı daha fazla kişiye ulaştırmak için yeni üyelik paketlerimizi incelemenizi tavsiye ederiz.\n\nPremium vitrin, öne çıkan ilanlar ve özel danışmanlık hizmetlerimizden faydalanarak satış hızınızı artırabilirsiniz.\n\nPaketlerimizi ekte bulabilir veya sitemiz üzerinden detaylı inceleyebilirsiniz.\n\nSaygılarımızla,\nHaradan.com Ekibi`,
    },
    {
        channel: 'EMAIL',
        topic: 'SPONSORSHIP',
        subject: `{stud_name} & Haradan.com Özel İş Birliği Teklifi`,
        template: `Sayın {person_name},\n\n{stud_name} markasının sektördeki konumu ve vizyonu, Haradan.com'un yenilikçi yaklaşımıyla harika bir uyum yakalayabilir.\n\nSizlere özel hazırladığımız sponsorluk ve reklam fırsatlarıyla, platformumuzdaki binlerce at severe doğrudan ulaşma imkanı sunuyoruz.\n\nBu fırsatları değerlendirmek üzere bir toplantı planlamak isteriz.\n\nSaygılarımızla,\nHaradan.com Ekibi`,
    },
    {
        channel: 'EMAIL',
        topic: 'FOLLOWUP',
        subject: `{stud_name} Haradan.com Durum Değerlendirmesi`,
        template: `Sayın {person_name},\n\nGeçtiğimiz günlerde yaptığımız görüşmeye istinaden, {stud_name} olarak Haradan.com üzerindeki güncel durumunuzu değerlendirmek istedik.\n\nPlatform kullanımıyla ilgili sorularınız varsa veya ilan ekleme sürecinde desteğe ihtiyacınız olursa, uzman ekibimiz size yardımcı olmaktan memnuniyet duyacaktır.\n\nİyi çalışmalar dileriz.\n\nSaygılarımızla,\nHaradan.com Ekibi`,
    }
];

import type { Phrase } from '@/domain/entities/Phrasebook';

type PhraseTranslations = Record<'sk' | 'en' | 'de' | 'zh', string>;

function phrase(id: string, categoryId: Phrase['categoryId'], t: PhraseTranslations): Phrase {
  return { id, categoryId, translations: t };
}

export const PHRASEBOOK_PHRASES: Phrase[] = [
  // Restaurant
  phrase('rest-1', 'restaurant', {
    sk: 'Stôl pre dvoch, prosím.',
    en: 'A table for two, please.',
    de: 'Einen Tisch für zwei, bitte.',
    zh: '请给我们一张两人桌。',
  }),
  phrase('rest-2', 'restaurant', {
    sk: 'Môžem dostať menu?',
    en: 'Can I see the menu?',
    de: 'Kann ich die Speisekarte sehen?',
    zh: '可以给我菜单吗？',
  }),
  phrase('rest-3', 'restaurant', {
    sk: 'Nejem mäso.',
    en: "I don't eat meat.",
    de: 'Ich esse kein Fleisch.',
    zh: '我不吃肉。',
  }),
  phrase('rest-4', 'restaurant', {
    sk: 'Som alergický na orechy.',
    en: "I'm allergic to nuts.",
    de: 'Ich bin allergisch gegen Nüsse.',
    zh: '我对坚果过敏。',
  }),
  phrase('rest-5', 'restaurant', {
    sk: 'Prosím účet.',
    en: 'The bill, please.',
    de: 'Die Rechnung, bitte.',
    zh: '请买单。',
  }),
  phrase('rest-6', 'restaurant', {
    sk: 'Bolo to veľmi dobré.',
    en: 'That was delicious.',
    de: 'Das war sehr lecker.',
    zh: '非常好吃。',
  }),
  phrase('rest-7', 'restaurant', {
    sk: 'Môžem platiť kartou?',
    en: 'Can I pay by card?',
    de: 'Kann ich mit Karte bezahlen?',
    zh: '可以刷卡吗？',
  }),

  // Hotel
  phrase('hotel-1', 'hotel', {
    sk: 'Mám rezerváciu.',
    en: 'I have a reservation.',
    de: 'Ich habe eine Reservierung.',
    zh: '我有预订。',
  }),
  phrase('hotel-2', 'hotel', {
    sk: 'Check-in, prosím.',
    en: 'Check-in, please.',
    de: 'Check-in, bitte.',
    zh: '请办理入住。',
  }),
  phrase('hotel-3', 'hotel', {
    sk: 'Kedy je raňajky?',
    en: 'When is breakfast?',
    de: 'Wann gibt es Frühstück?',
    zh: '早餐几点开始？',
  }),
  phrase('hotel-4', 'hotel', {
    sk: 'Potrebujem uteráky.',
    en: 'I need towels.',
    de: 'Ich brauche Handtücher.',
    zh: '我需要毛巾。',
  }),
  phrase('hotel-5', 'hotel', {
    sk: 'Wi-Fi heslo, prosím.',
    en: 'Wi-Fi password, please.',
    de: 'WLAN-Passwort, bitte.',
    zh: '请问Wi-Fi密码。',
  }),
  phrase('hotel-6', 'hotel', {
    sk: 'Check-out je o koľkej?',
    en: 'What time is check-out?',
    de: 'Wann ist Check-out?',
    zh: '退房是几点？',
  }),
  phrase('hotel-7', 'hotel', {
    sk: 'Môžete zavolať taxík?',
    en: 'Can you call a taxi?',
    de: 'Können Sie ein Taxi rufen?',
    zh: '可以帮我叫出租车吗？',
  }),

  // Taxi
  phrase('taxi-1', 'taxi', {
    sk: 'Prosím, odvezte ma sem.',
    en: 'Please take me here.',
    de: 'Bitte fahren Sie mich hierher.',
    zh: '请带我去这里。',
  }),
  phrase('taxi-2', 'taxi', {
    sk: 'Koľko to bude stáť?',
    en: 'How much will it cost?',
    de: 'Wie viel kostet das?',
    zh: '大概多少钱？',
  }),
  phrase('taxi-3', 'taxi', {
    sk: 'Zastavte tu, prosím.',
    en: 'Stop here, please.',
    de: 'Bitte hier anhalten.',
    zh: '请在这里停。',
  }),
  phrase('taxi-4', 'taxi', {
    sk: 'Môžete zapnúť taximeter?',
    en: 'Can you turn on the meter?',
    de: 'Können Sie den Taxameter einschalten?',
    zh: '请打表。',
  }),
  phrase('taxi-5', 'taxi', {
    sk: 'Som v sklze, prosím rýchlo.',
    en: "I'm in a hurry, please hurry.",
    de: 'Ich habe es eilig, bitte schnell.',
    zh: '我赶时间，请快一点。',
  }),
  phrase('taxi-6', 'taxi', {
    sk: 'Máte voľné taxi?',
    en: 'Do you have a free taxi?',
    de: 'Haben Sie ein freies Taxi?',
    zh: '有空车吗？',
  }),

  // Shopping
  phrase('shop-1', 'shopping', {
    sk: 'Koľko to stojí?',
    en: 'How much does this cost?',
    de: 'Wie viel kostet das?',
    zh: '这个多少钱？',
  }),
  phrase('shop-2', 'shopping', {
    sk: 'Je to príliš drahé.',
    en: "That's too expensive.",
    de: 'Das ist zu teuer.',
    zh: '太贵了。',
  }),
  phrase('shop-3', 'shopping', {
    sk: 'Môžete zľaviť?',
    en: 'Can you give a discount?',
    de: 'Können Sie einen Rabatt geben?',
    zh: '可以便宜一点吗？',
  }),
  phrase('shop-4', 'shopping', {
    sk: 'Beriem to.',
    en: "I'll take it.",
    de: 'Ich nehme es.',
    zh: '我要这个。',
  }),
  phrase('shop-5', 'shopping', {
    sk: 'Máte inú veľkosť?',
    en: 'Do you have another size?',
    de: 'Haben Sie eine andere Größe?',
    zh: '有其他尺码吗？',
  }),
  phrase('shop-6', 'shopping', {
    sk: 'Len sa pozerám.',
    en: "I'm just looking.",
    de: 'Ich schaue mich nur um.',
    zh: '我只是看看。',
  }),
  phrase('shop-7', 'shopping', {
    sk: 'Môžem platiť mobilom?',
    en: 'Can I pay with my phone?',
    de: 'Kann ich mit dem Handy bezahlen?',
    zh: '可以手机支付吗？',
  }),

  // Emergency
  phrase('emerg-1', 'emergency', {
    sk: 'Pomoc!',
    en: 'Help!',
    de: 'Hilfe!',
    zh: '救命！',
  }),
  phrase('emerg-2', 'emergency', {
    sk: 'Zavolajte políciu!',
    en: 'Call the police!',
    de: 'Rufen Sie die Polizei!',
    zh: '请报警！',
  }),
  phrase('emerg-3', 'emergency', {
    sk: 'Som v nebezpečenstve.',
    en: "I'm in danger.",
    de: 'Ich bin in Gefahr.',
    zh: '我有危险。',
  }),
  phrase('emerg-4', 'emergency', {
    sk: 'Stratil som pas.',
    en: 'I lost my passport.',
    de: 'Ich habe meinen Pass verloren.',
    zh: '我护照丢了。',
  }),
  phrase('emerg-5', 'emergency', {
    sk: 'Potrebujem ambulanciu.',
    en: 'I need an ambulance.',
    de: 'Ich brauche einen Krankenwagen.',
    zh: '我需要救护车。',
  }),
  phrase('emerg-6', 'emergency', {
    sk: 'Kde je najbližšia polícia?',
    en: 'Where is the nearest police station?',
    de: 'Wo ist die nächste Polizeistation?',
    zh: '最近的派出所在哪里？',
  }),

  // Hospital
  phrase('hosp-1', 'hospital', {
    sk: 'Necítim sa dobre.',
    en: "I don't feel well.",
    de: 'Ich fühle mich nicht gut.',
    zh: '我不舒服。',
  }),
  phrase('hosp-2', 'hospital', {
    sk: 'Bol som okradnutý.',
    en: 'I was robbed.',
    de: 'Ich wurde ausgeraubt.',
    zh: '我被抢了。',
  }),
  phrase('hosp-3', 'hospital', {
    sk: 'Mám horúčku.',
    en: 'I have a fever.',
    de: 'Ich habe Fieber.',
    zh: '我发烧了。',
  }),
  phrase('hosp-4', 'hospital', {
    sk: 'Som alergický na penicilín.',
    en: "I'm allergic to penicillin.",
    de: 'Ich bin allergisch gegen Penicillin.',
    zh: '我对青霉素过敏。',
  }),
  phrase('hosp-5', 'hospital', {
    sk: 'Kde je pohotovosť?',
    en: 'Where is the emergency room?',
    de: 'Wo ist die Notaufnahme?',
    zh: '急诊在哪里？',
  }),
  phrase('hosp-6', 'hospital', {
    sk: 'Potrebujem lekára.',
    en: 'I need a doctor.',
    de: 'Ich brauche einen Arzt.',
    zh: '我需要医生。',
  }),
  phrase('hosp-7', 'hospital', {
    sk: 'Bol som bitý.',
    en: 'I was assaulted.',
    de: 'Ich wurde angegriffen.',
    zh: '我被打伤了。',
  }),

  // Customs
  phrase('cust-1', 'customs', {
    sk: 'Toto je na osobnú spotrebu.',
    en: 'This is for personal use.',
    de: 'Das ist für den persönlichen Gebrauch.',
    zh: '这是自用的。',
  }),
  phrase('cust-2', 'customs', {
    sk: 'Cestujem za turistikou.',
    en: "I'm traveling for tourism.",
    de: 'Ich reise touristisch.',
    zh: '我是来旅游的。',
  }),
  phrase('cust-3', 'customs', {
    sk: 'Nemám nič na ohlásenie.',
    en: 'I have nothing to declare.',
    de: 'Ich habe nichts zu verzollen.',
    zh: '我没有需要申报的物品。',
  }),
  phrase('cust-4', 'customs', {
    sk: 'Tu je môj pas.',
    en: 'Here is my passport.',
    de: 'Hier ist mein Pass.',
    zh: '这是我的护照。',
  }),
  phrase('cust-5', 'customs', {
    sk: 'Budem tu týždeň.',
    en: "I'll be here for one week.",
    de: 'Ich bleibe eine Woche.',
    zh: '我会待一周。',
  }),
  phrase('cust-6', 'customs', {
    sk: 'Kde je kontrola?',
    en: 'Where is the inspection?',
    de: 'Wo ist die Kontrolle?',
    zh: '检查在哪里？',
  }),

  // Airport
  phrase('air-1', 'airport', {
    sk: 'Kde je odletová hala?',
    en: 'Where is the departure hall?',
    de: 'Wo ist die Abflughalle?',
    zh: '出发大厅在哪里？',
  }),
  phrase('air-2', 'airport', {
    sk: 'Kde je pás na batožinu?',
    en: 'Where is the baggage carousel?',
    de: 'Wo ist das Gepäckband?',
    zh: '行李转盘在哪里？',
  }),
  phrase('air-3', 'airport', {
    sk: 'Stratil som batožinu.',
    en: 'I lost my luggage.',
    de: 'Ich habe mein Gepäck verloren.',
    zh: '我的行李丢了。',
  }),
  phrase('air-4', 'airport', {
    sk: 'Kde je gate?',
    en: 'Where is the gate?',
    de: 'Wo ist das Gate?',
    zh: '登机口在哪里？',
  }),
  phrase('air-5', 'airport', {
    sk: 'Let mešká.',
    en: 'The flight is delayed.',
    de: 'Der Flug hat Verspätung.',
    zh: '航班延误了。',
  }),
  phrase('air-6', 'airport', {
    sk: 'Kde je informácia?',
    en: 'Where is the information desk?',
    de: 'Wo ist der Informationsschalter?',
    zh: '问讯处在哪里？',
  }),
  phrase('air-7', 'airport', {
    sk: 'Potrebujem SIM kartu.',
    en: 'I need a SIM card.',
    de: 'Ich brauche eine SIM-Karte.',
    zh: '我需要电话卡。',
  }),
];

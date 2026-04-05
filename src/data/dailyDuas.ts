export type DailyDua = {
  id: string;
  title: string;
  arabic: string;
  /** Hindi / Devanagari transliteration of the Arabic. */
  transliteration: string;
  /** Hindi meaning / explanation. */
  meaning: string;
};

/**
 * Short daily supplications — Arabic primary; Hindi helpers for Indian users.
 * Verify wording with your scholar for sensitive contexts.
 */
export const DAILY_DUAS: DailyDua[] = [
  {
    id: 'before-food',
    title: 'Before eating',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'बिस्मिल्लाहि',
    meaning: 'खाना शुरू करने से पहले: “अल्लाह के नाम से।”',
  },
  {
    id: 'after-food',
    title: 'After eating',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مِنَ الْمُسْلِمِينَ',
    transliteration:
      'अल्हम्दु लिल्लाहिल्लज़ी अत’अमना व सक़ाना व ज’अलना मिनल मुस्लिमीन',
    meaning: 'खाना खत्म होने पर शुक्रिया: जिसने हमें खिलाया-पिलाया और मुसलमान बनाया।',
  },
  {
    id: 'before-sleep',
    title: 'Before sleeping',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'बिस्मिका अल्लाहुम्मा अमूतु व अह्या',
    meaning: 'ऐ अल्लाह, तेरे नाम से मैं मरता (सोता) हूँ और जीता (जागता) हूँ।',
  },
  {
    id: 'wake-up',
    title: 'When waking up',
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration:
      'अल्हम्दु लिल्लाहिल्लज़ी अह्याना ब’अद मा अमातना व इलैहिन नुशूर',
    meaning: 'उस अल्लाह की प्रशंसा जिसने हमें मौत के बाद जिलाया; उसी की ओर उठाया जाएगा।',
  },
  {
    id: 'enter-bathroom',
    title: 'Entering the bathroom',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ',
    transliteration: 'अल्लाहुम्मा इन्नी अ’ऊज़ु बिका मिनल खुबुसि वल खबाइस',
    meaning: 'ऐ अल्लाह, मैं पुरुष/स्त्री शैतान (नापाक जिन्न) से तेरी पनाह माँगता हूँ।',
  },
  {
    id: 'leave-bathroom',
    title: 'Leaving the bathroom',
    arabic: 'غُفْرَانَكَ',
    transliteration: 'ग़ुफ़्रानक',
    meaning: 'तेरी क्षमा (और पवित्रता) माँगता हूँ।',
  },
  {
    id: 'enter-home',
    title: 'Entering home',
    arabic:
      'بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْनَا',
    transliteration:
      'बिस्मिल्लाहि वलजना व बिस्मिल्लाहि खरजना व अ’लल्लाहि रब्बिना तवक्कलना',
    meaning: 'अल्लाह के नाम से अंदर आए, नाम से निकलेंगे; अपने रब अल्लाह पर भरोसा है।',
  },
  {
    id: 'leave-home',
    title: 'Leaving home',
    arabic:
      'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration:
      'बिस्मिल्लाहि तवक्कल्तु अ’लल्लाहि ला हौला वला क़ुव्वता इल्ला बिल्लाह',
    meaning: 'अल्लाह के नाम से — अल्लाह पर भरोसा; कोई ताकत नहीं सिवाय अल्लाह के।',
  },
  {
    id: 'new-clothes',
    title: 'Wearing new clothes',
    arabic:
      'الْحَमْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration:
      'अल्हम्दु लिल्लाहिल्लज़ी कसानी हाज़ा व रज़क़नीही मिन ग़ैरी हौलिन मिन्नी वला क़ुव्वतिन',
    meaning: 'उस अल्लाह की प्रशंसा जिसने यह कपड़ा पहनाया; बिना मेरी ताकत के रिज़्क़ दिया।',
  },
  {
    id: 'mirror',
    title: 'Looking in the mirror',
    arabic: 'اللَّهُمَّ أَنْتَ حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي',
    transliteration: 'अल्लाहुम्मा अन्ता हस्सनता ख़ल्क़ी फहस्सिन ख़ुलुक़ी',
    meaning: 'ऐ अल्लाह, तूने मेरा बदन सुंदर बनाया — मेरा चरित्र भी सुंदर बना दे।',
  },
  {
    id: 'enter-mosque',
    title: 'Entering the masjid',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'अल्लाहुम्म इफ़्तह ली अबवाबा रहमतिक',
    meaning: 'ऐ अल्लाह, मेरे लिए अपनी रहमत के दरवाज़े खोल दे।',
  },
  {
    id: 'leave-mosque',
    title: 'Leaving the masjid',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: 'अल्लाहुम्मा इन्नी अस’अलुका मिन फ़ड़्लिक',
    meaning: 'ऐ अल्लाह, मैं तेरे फ़ज़्ल (उदारता) से माँगता हूँ।',
  },
  {
    id: 'travel',
    title: 'When traveling / riding',
    arabic:
      'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    transliteration:
      'सुब्हानल्लज़ी सख़्खर लना हाज़ा वमा कुन्ना लहु मुक़रिनीन व इन्ना इला रब्बिना लमुनक़लिबून',
    meaning: 'पाक है वह जिसने यह वाहन हमारे वश में किया; हम अपने रब की ओर लौटने वाले हैं।',
  },
  {
    id: 'distress',
    title: 'In worry or distress',
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ',
    transliteration: 'ला इलाहा इल्लल्लाहुल अ’ज़ीमुल हलीम',
    meaning: 'कोई माबूद नहीं सिवाय अल्लाह के — वह बड़ा करीम और बड़ा सब्र वाला है।',
  },
  {
    id: 'knowledge',
    title: 'Seeking beneficial knowledge',
    arabic: 'اللَّهُمَّ انْفَعْنِي بِمَا عَلَّمْتَنِي وَعَلِّمْنِي مَا يَنْفَعُنِي',
    transliteration: 'अल्लाहुम्म इनफ़’नी बिमा अ’ल्लमतनी व अ’ल्लिमनी मा यनफ़’उनी',
    meaning: 'ऐ अल्लाह, जो सिखाया उससे फ़ायदा दे; जो फ़ायदेमंद है वह सिखा दे।',
  },
];

import type { Phase } from './core/types'

/**
 * All player-facing text (Mongolian). Data files under config/ carry their own
 * Mongolian `label`s; everything composed in code lives here.
 */
export const mn = {
  title: 'Монгол хаант улс',

  phase: {
    Sunrise: 'Үүр цайх',
    Day: 'Өдөр',
    Sunset: 'Нар жаргах',
    Night: 'Шөнө',
  } satisfies Record<Phase, string>,
  dayN: (n: number) => `Өдөр ${n}`,
  nightN: (n: number) => `Шөнө ${n}`,
  sunSetting: 'Нар жаргаж байна...',
  nightSurvived: 'Та шөнийг даван туулав.',
  nightReport: (kills: number, lost: number) =>
    lost > 0
      ? `Шөнө дууслаа: ${kills} дайсан устгав, ${lost} иргэн амиа алдав.`
      : `Шөнө дууслаа: ${kills} дайсан устгав, хэн ч амиа алдсангүй.`,
  raidPreview: (left: number, right: number) =>
    `Шөнө дайсан ирнэ: зүүнээс ${left}, баруунаас ${right}.`,
  buildOutpost: 'Застав байгуулах',
  campDestroyed: (loot: number) =>
    `Дайсны буудал устгагдлаа! Олз: ${loot} зоос.`,
  territoryExpanded: 'Нутаг тэлэгдлээ: шинэ газар таных боллоо.',
  eraName: (era: number) =>
    ['', 'Буудал', 'Суурин', 'Хот', 'Хаант улс'][Math.min(4, Math.max(1, era))],
  eraReached: (name: string) => `Шинэ эрин үе: ${name}`,
  needKingdom: (n: number) => `Хаант улсын ${n}-р түвшин хэрэгтэй`,
  offerOvoo: 'Овоог тахих',
  ovooUsed: 'Өнөөдөр тахисан',
  drawWater: 'Худгаас ус авах',
  wellUsed: 'Өнөөдөр ус авсан',
  digRuins: 'Балгас ухах',
  blessing: 'Тэнгэрийн ивээл: дараагийн шөнө харваачид илүү хүчтэй.',
  ovooCoins: (n: number) => `Овоо ивээллээ: ${n} зоос олов.`,
  ovooSilent: 'Овоо чимээгүй байлаа.',
  wellDone: 'Ус ууж, морь чинь сэргэв: түр хурдан явна.',
  ruinLoot: (n: number) => `Балгаснаас ${n} зоос олов.`,
  ruinAmbush: 'Балгас дунд дээрэмчид сэм харан хүлээж байлаа!',
  blessed: 'Ивээл',
  achievement: (label: string) => `Амжилт: ${label}`,
  achievements: {
    firstNight: 'Анхны шөнийг давлаа',
    fiveNights: 'Таван шөнийг давлаа',
    rich: '100 зоос цуглууллаа',
    slayer: '25 дайсан устгалаа',
    crowd: '10 иргэнтэй боллоо',
    campBreaker: 'Дайсны буудал устгалаа',
    expander: 'Нутгаа тэлэв',
    eraTwo: 'Суурин эрин үе',
    eraFour: 'Хаант улс байгууллаа',
    bossSlayer: 'Том довтолгоог няцаалаа',
    merchant: 'Захтай боллоо',
  } as Record<string, string>,
  achievementsTitle: 'Амжилтууд',
  bossWarning: 'Том арми тал нутгаар давхиж байна!',
  bossAnnounce: 'Дарга шөнө',
  bossDefeated: (coins: number) =>
    `Том довтолгоо няцаагдлаа! Шагнал: ${coins} зоос.`,
  difficulty: {
    easy: 'Хөнгөн',
    normal: 'Дунд',
    hard: 'Хүнд',
    label: 'Хүндрэл',
  },
  raidersSides: (left: number, right: number) => `←${left}  ${right}→`,
  meters: 'м',

  coins: (n: number) => `${n} зоос`,
  raiders: (n: number) => `Дайсан ${n}`,
  bannerStolen: 'ТУГ БУЛААГДЛАА!',
  bannerDropped: 'ТУГ УНАВ!',

  recruit: 'Элсүүлэх',
  upgrade: (what: string) => `Шинэчлэх: ${what}`,
  upgradeDone: (what: string) => `${what} бэлэн боллоо.`,
  upgradeOrdered: 'Барилгачид шинэчлэлтийг эхэллээ.',
  build: (what: string) => `${what} барих`,
  makeProfession: (stand: string, profession: string) =>
    `${stand}: ${profession} болгох`,
  noFreeCitizens: 'Сул иргэн алга',
  noPasture: 'Бэлчээр хэрэгтэй',
  noMarket: 'Зах хэрэгтэй',
  noSlots: 'Орон тоо дүүрсэн',
  makeTrader: (label: string) => `${label} болгох`,
  tradeDelivered: (n: number) => `Худалдаа: +${n} зоос`,
  travelTo: (what: string) => `Өртөөгөөр явах: ${what}`,
  travelOutpost: 'застав',
  travelOrtoo: 'нөгөө өртөө',
  travelled: 'Өртөөгөөр хурдан хүрлээ.',
  taxCollected: (n: number) => `Татвар: гэрт ${n} зоос хүлээж байна.`,
  notEnoughCoins: 'Зоос хүрэлцэхгүй байна.',

  citizenJoined: 'Шинэ иргэн танай буудалд нэгдлээ.',
  citizenBecame: (profession: string) => `Нэг иргэн ${profession} боллоо.`,
  citizenFell: 'Нэг иргэн амиа алдлаа.',
  structureDestroyed: 'Барилга нурлаа!',
  bannerFell: 'Туг унав!',
  bannerSeized: 'Дайсан тугийг булаан авлаа!',
  bannerRecovered: 'Та тугаа эргүүлэн авлаа.',

  reasonBannerLost: 'Туг таны нутгаас гадагш авагдлаа.',
  reasonGerFell: 'Төв гэр нурлаа.',

  objective: {
    label: 'Зорилго',
    coins: 'Зоос цуглуул: алтан овоолго руу давхи',
    recruit: 'Иргэн элсүүл: буудлын иргэнд ойртоод E дар',
    moreCitizens: 'Илүү иргэн элсүүл: тэд таны хүч',
    archer: 'Нумын тавиур дээр иргэнийг Харваач болго',
    builder: 'Алхны тавиур дээр иргэнийг Барилгачин болго',
    build: 'Гэрийн хажууд хашаа, цамхаг бариул',
    tower: 'Цамхаг бариул: харваачид дээрээс буудна',
    pasture: 'Бэлчээр бариул: малчид тогтмол зоос олно',
    herder: 'Уургын тавиур дээр иргэнийг Малчин болго',
    upgrade: 'Хашаа, цамхгаа шинэчилж бэхжүүл',
    market: 'Зах барь: худалдаачид хол явж зоос олно',
    trader: 'Захын дэргэд иргэнийг Худалдаачин болго',
    ortoo: 'Өртөө байгуул: баатар хурдан, хол аялна',
    ger: 'Төв гэрээ өргөтгө: шинэ барилга, ур чадвар нээгдэнэ',
    camp: 'Дайсны буудал руу давхиж устга (F дар)',
    outpost: 'Устсан буудал дээр застав байгуулж нутгаа тэл',
    sunset: 'Шөнө болох гэж байна: хамгаалалтаа бэлд',
    night: 'Шөнийг даван туул: гэр болон тугаа хамгаал',
  },
  population: {
    citizens: 'Иргэн',
  },
  controlsHint:
    'A D / ← →  давхих   Shift  хурдлах   E  үйлдэл   F  буудах   P  зогсоох',
  controlsShort: {
    ride: 'давхих',
    gallop: 'хурдлах',
    act: 'үйлдэл',
    shoot: 'буудах',
    pause: 'зогсоох',
    space: 'Зай',
  },

  menu: {
    kicker: 'Тал нутгийн амьдрал · хаант улс байгуулах',
    blurb:
      'Ганц гэрээсээ мордон гарч, зоос цуглуул, ард түмнээ элсүүл, хашаа цамхаг босгож, шөнө бүр тал нутгаа хамгаал.',
    newGame: 'Шинэ тоглоом',
    continue: 'Үргэлжлүүлэх',
  },
  pause: {
    title: 'Түр зогслоо',
    resume: 'Үргэлжлүүлэх',
    saveExit: 'Хадгалаад цэс рүү гарах',
    button: 'Зогсоох',
  },
  sound: (muted: boolean) => `Дуу: ${muted ? 'унтраасан' : 'асаалттай'}`,
  gameOver: {
    title: 'Таны хаант улс мөхлөө.',
    summary: (day: number, kills: number, coins: number) =>
      `${day}-р өдөр хүртэл тэсэв · ${kills} дайсан устгав · ${coins} зоос цуглуулав`,
    restartDay: 'Өдрийг дахин эхлэх',
    newGame: 'Шинэ тоглоом',
  },
} as const

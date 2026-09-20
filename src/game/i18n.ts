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
    upgrade: 'Хашаа, цамхгаа шинэчилж бэхжүүл',
    sunset: 'Шөнө болох гэж байна: хамгаалалтаа бэлд',
    night: 'Шөнийг даван туул: гэр болон тугаа хамгаал',
  },
  population: {
    citizens: 'Иргэн',
  },
  controlsHint:
    'A D / ← →  давхих     Shift  хурдлах     E / ↓ / Зай  үйлдэл     P  зогсоох',
  controlsShort: {
    ride: 'давхих',
    gallop: 'хурдлах',
    act: 'үйлдэл',
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

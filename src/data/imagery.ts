/**
 * Editorial and placeholder imagery, served from Unsplash's CDN (Unsplash License: free for commercial use,
 * no attribution required; hotlinking via images.unsplash.com is the supported way to use them).
 * Product photos here are stand-ins until the Gemini renders land; Admin → Appearance → "Use placeholder photos"
 * switches back to the catalog's own images.
 */
const u = (id: string, w = 1600, extra = '') => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75${extra}`;

export const IMG = {
  // Heroes (one per theme mood)
  heroWarm: u('1612293905607-b003de9e54fb', 2000),       // hand lighting an amber-jar candle with a match
  heroMinimal: u('1603218678692-3967d7523bb0', 2000),    // single black & white candle, lots of air
  heroDark: u('1601922046210-41e129a3e64a', 2000),       // lit candle in a dark room
  heroBright: u('1759262151026-42d27a1876ae', 2000),     // woman lighting a candle on a marble table
  heroBotanical: u('1613068431228-8cb6a1e92573', 2000),  // pillar candles with eucalyptus
  // Category tiles
  catCandles: u('1572726729207-a78d6feb18d7', 900),      // two amber glass jars
  catScrubs: u('1683944433023-027a3f443ae4', 900),       // jars of scrub on a table
  catLotions: u('1619451427882-6aaaded0cc61', 900),      // hands with lotion from a pump
  catSalts: u('1550623685-2227f7bbef18', 900),           // white salt in a glass jar
  catSets: u('1759563871375-d5b140f6646e', 900),         // white gift box, ribbon and wax seal
  // Scent families (ingredient / mood shots)
  famFloral: u('1785365801490-6ffde36bd1fe', 800),       // dried flowers floating in a bath
  famFresh: u('1634291196724-742f2a32463c', 800),        // eucalyptus leaves
  famGourmand: u('1667803552102-00de1188d66f', 800),     // sugar-scrub jar and spoon
  famSpiced: u('1696426678240-3e4700dd9487', 800),       // candle beside pumpkins
  famWoody: u('1603905179139-db12ab535ca9', 800),        // candle on a wooden holder
  famHoney: u('1528351655744-27cc30462816', 800),        // tea light on a brown surface
  famUnscented: u('1612634824306-30115acfb10c', 800),    // white candle on a white table
  // Story / editorial
  pour: u('1788537404964-cfa2d4d21fed', 1400),           // pouring from a brown bottle into a metal pitcher
  wick: u('1640101999152-64d72b089774', 1400),           // jar with a wick held by a pen
  bath: u('1776482128014-4af70a85f02d', 1400),           // bathtub with a window and bath accessories
  tray: u('1700918232124-f64da19e73eb', 1400),           // wooden tray, towel and flowers
  evening: u('1634391922288-1a8e9661ee18', 1400),        // person lighting a candle on a table
  holiday: u('1764150761677-eb67bcf5c4c6', 1400),        // lit candles with a red ribbon
  giftOpen: u('1760804876257-f073f77f2bcf', 1400),       // white candle in an open gift box
  giftDark: u('1760804876250-605a3cd49ede', 1400),       // black candle in a black gift box
  tissue: u('1602607203475-c5e99918dfc5', 1400),         // candle tin on tissue paper
  popup: u('1759262151253-375c311347c7', 900),           // hand lighting a candle on marble (welcome popup)
  // Scenes rail
  sceneBedside: u('1668112037360-900ff60ef6f7', 900),
  sceneTable: u('1640095889747-2090ee12fa7d', 900),
  sceneGlow: u('1758077223826-74f8ec22ebfd', 900),
  sceneCluster: u('1476900164809-ff19b8ae5968', 900),
  sceneWindow: u('1633067509824-a844350db73a', 900),
  sceneShelf: u('1662462753990-bea51b4713cd', 900),
};

/** Two stand-in photos per product (primary, hover). Keys are product ids from the catalog. */
const P = (a: string, b: string) => [u(a, 900), u(b, 900)] as [string, string];
export const PRODUCT_PLACEHOLDERS: Record<string, [string, string]> = {
  'lavender-dreams': P('1612198526331-66fcc90d67da', '1785365801490-6ffde36bd1fe'),
  'vanilla-bliss': P('1668112037360-900ff60ef6f7', '1640095889747-2090ee12fa7d'),
  'ocean-breeze': P('1611497402455-9848faa74cfc', '1758077223826-74f8ec22ebfd'),
  'pure-soy-natural': P('1612634824306-30115acfb10c', '1508093989287-061d64de7324'),
  'beeswax-classic': P('1528351655744-27cc30462816', '1570823635306-250abb06d4b3'),
  'cinnamon-spice': P('1696426678240-3e4700dd9487', '1764150761677-eb67bcf5c4c6'),
  'rose-garden': P('1777107857717-af7963c676a2', '1612198526331-66fcc90d67da'),
  'pine-forest': P('1603905179139-db12ab535ca9', '1636714528228-f469eefb3eef'),
  'eucalyptus-mint': P('1613068431228-8cb6a1e92573', '1634291196724-742f2a32463c'),
  'coconut-paradise': P('1572726729207-a78d6feb18d7', '1612293905607-b003de9e54fb'),
  'unscented-white': P('1611497402455-9848faa74cfc', '1612634824306-30115acfb10c'),
  'pumpkin-spice': P('1602607203588-d6d0eda790e3', '1696426678240-3e4700dd9487'),
  'brown-sugar-vanilla-scrub': P('1667803552102-00de1188d66f', '1667803546535-81f5b1c4dbfb'),
  'coffee-coconut-scrub': P('1683944433023-027a3f443ae4', '1667803597410-f7876c2536c9'),
  'oat-honey-hand-lotion': P('1597931752949-98c74b5b159f', '1619451427882-6aaaded0cc61'),
  'lavender-body-lotion': P('1643716991841-91851103e69f', '1643716991736-b83d4bf474b4'),
  'eucalyptus-recovery-soak': P('1550623685-2227f7bbef18', '1584683596603-61fbfa842a47'),
  'rose-pink-salt-soak': P('1548110579-526dc051a76b', '1550407665-942ceef4bf37'),
  'spa-night-set': P('1760804876257-f073f77f2bcf', '1700918232124-f64da19e73eb'),
  'cozy-evening-trio': P('1759563871375-d5b140f6646e', '1602607203475-c5e99918dfc5'),
  'corporate-sample-kit': P('1760804876364-33c5063a7540', '1760804876250-605a3cd49ede'),
};
const FALLBACK: [string, string] = P('1668112037360-900ff60ef6f7', '1612293905607-b003de9e54fb');
export const placeholderImages = (productId: string) => PRODUCT_PLACEHOLDERS[productId] ?? FALLBACK;

export const FAMILY_IMAGES: Record<string, string> = {
  Floral: IMG.famFloral, Fresh: IMG.famFresh, Gourmand: IMG.famGourmand, Spiced: IMG.famSpiced, Woody: IMG.famWoody, Honey: IMG.famHoney, Unscented: IMG.famUnscented,
};
export const FAMILY_BLURBS: Record<string, string> = {
  Floral: 'Lavender, rose, soft and calm', Fresh: 'Eucalyptus, sea air, clean linen', Gourmand: 'Vanilla, coconut, brown sugar', Spiced: 'Cinnamon, clove, pumpkin', Woody: 'Pine, cedar, winter trees', Honey: 'Beeswax and oat, warm and plain', Unscented: 'Just the flame',
};

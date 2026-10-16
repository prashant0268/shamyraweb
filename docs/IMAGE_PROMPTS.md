# Kind Flames — image generation prompts (Gemini)

Generated 2026-10-16 from `src/data/catalog.json`. 74 shots across 21 products.

## How to use

1. Open Gemini (gemini.google.com, or Google AI Studio with the image model) and start **one new chat per product**.
2. **Attach the logo file** `public/img/logo-lockup.png` to the first message of each chat (also at https://kindflames.com/img/logo-lockup.png once deployed). It's the black KF monogram with the KINDFLAMES wordmark on a transparent background; Gemini copies it onto the labels.
3. Paste the **Brand style block** below as the first message, with the logo attached. Then send each shot prompt as its own message.
4. Settings: square **1:1** aspect ratio, highest quality available. Generate 2–4 candidates per shot and keep the best one.
5. Label text is the part AI gets wrong most. If a label is misspelled or garbled, reply "Regenerate; the label must read exactly: …" with the text again. Don't chase perfection on the small 4 oz jars in the lineup shots.
6. Save files with **exactly these names** into one folder, e.g. `~/Downloads/kindflames-images/`. The name is given with each prompt (`lavender-dreams-1-hero.png`). PNG or JPG is fine. Tell me the folder and I'll crop, colour-match, convert to WebP at 800 and 400 px and upload everything through the admin.

## Brand style block (first message of every chat, with the logo attached)

```
You are producing product photography for Kind Flames, a small hand-poured candle and bath brand from New Jersey. Treat every image in this chat as part of one consistent catalogue shot by the same photographer.

STYLE: real photograph, not an illustration. Natural soft daylight from a window on the left, gentle shadows, shallow depth of field on lifestyle shots and sharp front-to-back on product shots. Calm, warm, minimal. No people's faces. No extra text anywhere in the scene except the product labels described below. Colour palette: warm off-white (#F3F1EC), deep pine green (#214238), honey gold (#C68A1E), natural kraft, linen, light oak wood, white marble, matte ceramic. Nothing glossy or neon.

LOGO: the attached image is the Kind Flames logo: a black "KF" monogram where the stem of the F is a flame, with the wordmark KINDFLAMES in widely spaced black capitals beneath it. Reproduce it faithfully on every label, centred at the top of the label, in black on the cream label. On small labels (4 oz jars, travel tube, sachets) use just the KF monogram without the wordmark. Do not redraw, recolour or restyle it.

PACKAGING SYSTEM (use the same every time):
- Candles: straight-sided clear glass tumbler jar, natural off-white soy wax (no colour in the wax), a brushed gold metal lid shown beside or behind the jar. Label: a matte cream (#F3F1EC) rectangular paper label wrapped on the front of the jar with the logo at the top, the product name in an elegant serif (like Fraunces) in black, the three fragrance notes in small sans-serif below separated by small dots, and the size in small text at the bottom. A thin honey-gold rule under the product name is the only colour on the label.
- Body scrubs: wide-mouth frosted glass jar with a bamboo screw lid. Same cream label system with name, notes, size.
- Lotions: matte amber glass pump bottle (8 oz) and a small matte white travel tube (2 oz) where mentioned. Same cream label system.
- Bath salts: clear glass apothecary jar with a cork lid and a small wooden scoop. Same cream label system.
- Gift sets: a natural kraft box with a lift-off lid, cream crinkle paper, a cream round sticker printed with the black KF monogram sealing a cream card.

Reply "Ready" and wait for the shot prompts.
```

## Candles

### Lavender Dreams (Floral; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`lavender-dreams-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Lavender Dreams" / "Bergamot · French lavender · Tonka bean" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`lavender-dreams-2-lit.png`**

```
Lifestyle shot. The same 8 oz Lavender Dreams candle, lit with a small steady flame, placed on a bedside table at dusk with white linen, a closed book and a sprig of dried lavender. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Lavender Dreams" / "Bergamot · French lavender · Tonka bean" / "8 oz".
```

**`lavender-dreams-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Lavender Dreams jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with dried lavender sprigs and a few bergamot peel curls arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`lavender-dreams-4-sizes.png`**

```
Size lineup. 3 Kind Flames Lavender Dreams candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Lavender Dreams" / "Bergamot · French lavender · Tonka bean" / "8 oz".
```

### Vanilla Bliss (Gourmand; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`vanilla-bliss-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Vanilla Bliss" / "Brown sugar · Madagascar vanilla · Sandalwood" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`vanilla-bliss-2-lit.png`**

```
Lifestyle shot. The same 8 oz Vanilla Bliss candle, lit with a small steady flame, placed on a kitchen counter in the morning with a ceramic mug and a small dish of brown sugar. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Vanilla Bliss" / "Brown sugar · Madagascar vanilla · Sandalwood" / "8 oz".
```

**`vanilla-bliss-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Vanilla Bliss jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with a vanilla pod split open and a small heap of brown sugar arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`vanilla-bliss-4-sizes.png`**

```
Size lineup. 3 Kind Flames Vanilla Bliss candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Vanilla Bliss" / "Brown sugar · Madagascar vanilla · Sandalwood" / "8 oz".
```

### Ocean Breeze (Fresh; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`ocean-breeze-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Ocean Breeze" / "Sea salt · Driftwood · White musk" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`ocean-breeze-2-lit.png`**

```
Lifestyle shot. The same 8 oz Ocean Breeze candle, lit with a small steady flame, placed on a bathroom windowsill with white tiles, a piece of driftwood and a folded white towel. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Ocean Breeze" / "Sea salt · Driftwood · White musk" / "8 oz".
```

**`ocean-breeze-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Ocean Breeze jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with a small piece of pale driftwood and coarse sea salt arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`ocean-breeze-4-sizes.png`**

```
Size lineup. 3 Kind Flames Ocean Breeze candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Ocean Breeze" / "Sea salt · Driftwood · White musk" / "8 oz".
```

### Pure Soy Natural (Unscented; 100% soy, cotton wick; sizes 8 oz, 12 oz)

**`pure-soy-natural-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Pure Soy Natural" / "8 oz". Wax: natural off-white 100% soy, a single cotton wick. Square, sharp, catalogue style.
```

**`pure-soy-natural-2-lit.png`**

```
Lifestyle shot. The same 8 oz Pure Soy Natural candle, lit with a small steady flame, placed on a set dinner table with linen napkins and simple stoneware, candle lit at the centre. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Pure Soy Natural" / "8 oz".
```

**`pure-soy-natural-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Pure Soy Natural jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with a cotton wick trimmer and plain soy wax flakes arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`pure-soy-natural-4-sizes.png`**

```
Size lineup. 2 Kind Flames Pure Soy Natural candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 8 oz, 12 oz. Same label on each; only the size line changes (8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Pure Soy Natural" / "8 oz".
```

### Beeswax Classic (Honey; 100% beeswax, cotton wick; sizes 8 oz, 12 oz)

**`beeswax-classic-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Beeswax Classic" / "Raw honey · Beeswax · Warm hay" / "8 oz". Wax: natural off-white 100% beeswax, a single cotton wick. The wax is natural honey-yellow beeswax, not white. Square, sharp, catalogue style.
```

**`beeswax-classic-2-lit.png`**

```
Lifestyle shot. The same 8 oz Beeswax Classic candle, lit with a small steady flame, placed on a rustic oak shelf with a small jar of honey and a honey dipper. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Beeswax Classic" / "Raw honey · Beeswax · Warm hay" / "8 oz". The wax is natural honey-yellow beeswax, not white.
```

**`beeswax-classic-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Beeswax Classic jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with a piece of honeycomb and a wooden honey dipper arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light. The wax is natural honey-yellow beeswax, not white.
```

**`beeswax-classic-4-sizes.png`**

```
Size lineup. 2 Kind Flames Beeswax Classic candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 8 oz, 12 oz. Same label on each; only the size line changes (8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Beeswax Classic" / "Raw honey · Beeswax · Warm hay" / "8 oz".
```

### Cinnamon Spice (Spiced; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`cinnamon-spice-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Cinnamon Spice" / "Orange peel · Cinnamon bark · Clove" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`cinnamon-spice-2-lit.png`**

```
Lifestyle shot. The same 8 oz Cinnamon Spice candle, lit with a small steady flame, placed on a dark wooden table on a winter evening with dried orange slices, cinnamon sticks and a wool throw. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Cinnamon Spice" / "Orange peel · Cinnamon bark · Clove" / "8 oz".
```

**`cinnamon-spice-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Cinnamon Spice jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with cinnamon sticks, dried orange slices and a few cloves arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`cinnamon-spice-4-sizes.png`**

```
Size lineup. 3 Kind Flames Cinnamon Spice candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Cinnamon Spice" / "Orange peel · Cinnamon bark · Clove" / "8 oz".
```

### Rose Garden (Floral; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`rose-garden-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Rose Garden" / "Green stem · English rose · Soft musk" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`rose-garden-2-lit.png`**

```
Lifestyle shot. The same 8 oz Rose Garden candle, lit with a small steady flame, placed on a dressing table with a small bud vase of pale pink English roses and a linen runner. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Rose Garden" / "Green stem · English rose · Soft musk" / "8 oz".
```

**`rose-garden-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Rose Garden jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with fresh pale-pink rose petals and a green stem arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`rose-garden-4-sizes.png`**

```
Size lineup. 3 Kind Flames Rose Garden candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Rose Garden" / "Green stem · English rose · Soft musk" / "8 oz".
```

### Pine Forest (Woody; Coconut-soy blend, wood wick; sizes 4 oz, 8 oz, 12 oz)

**`pine-forest-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Pine Forest" / "Juniper · Nordic pine · Moss" / "8 oz". Wax: natural off-white coconut-soy blend, a flat wooden wick. Square, sharp, catalogue style.
```

**`pine-forest-2-lit.png`**

```
Lifestyle shot. The same 8 oz Pine Forest candle, lit with a small steady flame, placed on a cabin windowsill with snow-dusted pine branches outside. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Pine Forest" / "Juniper · Nordic pine · Moss" / "8 oz".
```

**`pine-forest-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Pine Forest jar showing the smooth off-white wax surface and a flat wooden wick, lid off beside it, with juniper berries, a small Nordic pine sprig and a patch of moss arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`pine-forest-4-sizes.png`**

```
Size lineup. 3 Kind Flames Pine Forest candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Pine Forest" / "Juniper · Nordic pine · Moss" / "8 oz".
```

### Eucalyptus Mint (Fresh; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`eucalyptus-mint-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Eucalyptus Mint" / "Spearmint · Eucalyptus · Cedar" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`eucalyptus-mint-2-lit.png`**

```
Lifestyle shot. The same 8 oz Eucalyptus Mint candle, lit with a small steady flame, placed on the edge of a white bathtub with eucalyptus stems, a glass of water and a rolled towel. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Eucalyptus Mint" / "Spearmint · Eucalyptus · Cedar" / "8 oz".
```

**`eucalyptus-mint-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Eucalyptus Mint jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with fresh eucalyptus leaves and a spearmint sprig arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`eucalyptus-mint-4-sizes.png`**

```
Size lineup. 3 Kind Flames Eucalyptus Mint candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Eucalyptus Mint" / "Spearmint · Eucalyptus · Cedar" / "8 oz".
```

### Coconut Paradise (Gourmand; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`coconut-paradise-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Coconut Paradise" / "Sea salt · Toasted coconut · Vanilla" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`coconut-paradise-2-lit.png`**

```
Lifestyle shot. The same 8 oz Coconut Paradise candle, lit with a small steady flame, placed on a sunlit windowsill with a halved coconut and a linen cloth, summer light. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Coconut Paradise" / "Sea salt · Toasted coconut · Vanilla" / "8 oz".
```

**`coconut-paradise-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Coconut Paradise jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with toasted coconut flakes and a halved coconut arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`coconut-paradise-4-sizes.png`**

```
Size lineup. 3 Kind Flames Coconut Paradise candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Coconut Paradise" / "Sea salt · Toasted coconut · Vanilla" / "8 oz".
```

### Unscented White (Unscented; 100% soy, cotton wick; sizes 8 oz, 12 oz)

**`unscented-white-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Unscented White" / "8 oz". Wax: natural off-white 100% soy, a single cotton wick. Square, sharp, catalogue style.
```

**`unscented-white-2-lit.png`**

```
Lifestyle shot. The same 8 oz Unscented White candle, lit with a small steady flame, placed on a white mantelpiece, minimal, with a second jar unlit at a different height. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Unscented White" / "8 oz".
```

**`unscented-white-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Unscented White jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with plain white soy wax flakes and a brass wick trimmer arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`unscented-white-4-sizes.png`**

```
Size lineup. 2 Kind Flames Unscented White candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 8 oz, 12 oz. Same label on each; only the size line changes (8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Unscented White" / "8 oz".
```

### Pumpkin Spice (Spiced; Coconut-soy blend, cotton wick; sizes 4 oz, 8 oz, 12 oz)

**`pumpkin-spice-1-hero.png`**

```
Product shot. One 8 oz Kind Flames candle jar, unlit, centred, front label fully legible, on a seamless warm off-white plaster backdrop with a light oak surface. Brushed gold lid standing just behind to the right. Soft window light from the left. Label text, exactly: "Pumpkin Spice" / "Pumpkin · Nutmeg · Brown butter" / "8 oz". Wax: natural off-white coconut-soy blend, a single cotton wick. Square, sharp, catalogue style.
```

**`pumpkin-spice-2-lit.png`**

```
Lifestyle shot. The same 8 oz Pumpkin Spice candle, lit with a small steady flame, placed on a farmhouse table in autumn with a small white pumpkin, nutmeg and a plaid cloth. Label readable but the mood is the subject. Shallow depth of field, warm evening light. Label text, exactly: "Pumpkin Spice" / "Pumpkin · Nutmeg · Brown butter" / "8 oz".
```

**`pumpkin-spice-3-detail.png`**

```
Detail shot, top-down at a slight angle. The open Pumpkin Spice jar showing the smooth off-white wax surface and a single cotton wick, lid off beside it, with a small pumpkin, whole nutmegs and a knob of browned butter on a dish arranged loosely next to the jar on linen. The label is partly visible. Macro feel, soft light.
```

**`pumpkin-spice-4-sizes.png`**

```
Size lineup. 3 Kind Flames Pumpkin Spice candle jars side by side on a light oak surface, warm off-white backdrop, from smallest to largest: 4 oz, 8 oz, 12 oz. Same label on each; only the size line changes (4 oz, 8 oz, 12 oz). Unlit, lids off and stacked at the side. Front-on, sharp, evenly lit. Label text, exactly: "Pumpkin Spice" / "Pumpkin · Nutmeg · Brown butter" / "8 oz".
```

## Body scrubs

### Brown Sugar & Vanilla Body Scrub (sizes 8 oz, 16 oz)

**`brown-sugar-vanilla-scrub-1-hero.png`**

```
Product shot. One 8 oz Kind Flames frosted glass jar of body scrub with a bamboo lid, label fully legible, on a seamless warm off-white backdrop with a white marble surface. Soft window light from the left. Label text, exactly: "Brown Sugar & Vanilla Body Scrub" / "Brown sugar · Vanilla · Sweet almond" / "8 oz". Square, sharp.
```

**`brown-sugar-vanilla-scrub-2-texture.png`**

```
Detail shot. The Brown Sugar & Vanilla Body Scrub jar open, bamboo lid beside it, a small wooden spoon lifting some scrub so the texture is visible: fine golden-brown sugar crystals suspended in pale oil. a vanilla pod and a spoon of brown sugar loosely around on marble. Top-down at a slight angle, macro feel.
```

**`brown-sugar-vanilla-scrub-3-lifestyle.png`**

```
Lifestyle shot. The Brown Sugar & Vanilla Body Scrub jar on the edge of a white bathtub or a shower ledge with a folded white waffle towel, a wooden bath brush and a little water on the surface. Morning light. Label readable. Label text, exactly: "Brown Sugar & Vanilla Body Scrub" / "Brown sugar · Vanilla · Sweet almond" / "8 oz".
```

### Coffee & Coconut Body Scrub (sizes 8 oz, 16 oz)

**`coffee-coconut-scrub-1-hero.png`**

```
Product shot. One 8 oz Kind Flames frosted glass jar of body scrub with a bamboo lid, label fully legible, on a seamless warm off-white backdrop with a white marble surface. Soft window light from the left. Label text, exactly: "Coffee & Coconut Body Scrub" / "Roasted coffee · Coconut · Cacao" / "8 oz". Square, sharp.
```

**`coffee-coconut-scrub-2-texture.png`**

```
Detail shot. The Coffee & Coconut Body Scrub jar open, bamboo lid beside it, a small wooden spoon lifting some scrub so the texture is visible: dark ground coffee in creamy coconut oil. roasted coffee beans and a piece of coconut loosely around on marble. Top-down at a slight angle, macro feel.
```

**`coffee-coconut-scrub-3-lifestyle.png`**

```
Lifestyle shot. The Coffee & Coconut Body Scrub jar on the edge of a white bathtub or a shower ledge with a folded white waffle towel, a wooden bath brush and a little water on the surface. Morning light. Label readable. Label text, exactly: "Coffee & Coconut Body Scrub" / "Roasted coffee · Coconut · Cacao" / "8 oz".
```

## Lotions

### Oat & Honey Hand Lotion (sizes 2 oz travel, 8 oz pump)

**`oat-honey-hand-lotion-1-hero.png`**

```
Product shot. One 8 oz matte amber glass pump bottle of Kind Flames lotion, with the matching 2 oz matte white travel tube standing beside it, labels fully legible, on a seamless warm off-white backdrop with a light oak surface. Soft window light. Label text, exactly: "Oat & Honey Hand Lotion" / "Oat milk · Honey · Shea" / "8 oz pump". The tube label is the same but its size line reads "2 oz travel". Square, sharp.
```

**`oat-honey-hand-lotion-2-lifestyle.png`**

```
Lifestyle shot. The Oat & Honey Hand Lotion pump bottle next to a kitchen sink with a linen tea towel and a wooden dish brush. Shallow depth of field, calm morning light. Label readable. Label text, exactly: "Oat & Honey Hand Lotion" / "Oat milk · Honey · Shea" / "8 oz pump".
```

**`oat-honey-hand-lotion-3-detail.png`**

```
Detail shot. A small swirl of creamy white lotion on a matte ceramic dish beside the Oat & Honey Hand Lotion bottle, with rolled oats, a honey dipper and a small jar of honey arranged loosely on linen. Top-down at a slight angle, macro feel, soft light.
```

### Lavender Body Lotion (sizes 8 oz pump)

**`lavender-body-lotion-1-hero.png`**

```
Product shot. One 8 oz matte amber glass pump bottle of Kind Flames lotion, labels fully legible, on a seamless warm off-white backdrop with a light oak surface. Soft window light. Label text, exactly: "Lavender Body Lotion" / "French lavender · Chamomile · Shea" / "8 oz pump". Square, sharp.
```

**`lavender-body-lotion-2-lifestyle.png`**

```
Lifestyle shot. The Lavender Body Lotion pump bottle on a bedside table with white linen and a sprig of lavender, next to the Kind Flames Lavender Dreams candle (same label system), unlit. Shallow depth of field, calm morning light. Label readable. Label text, exactly: "Lavender Body Lotion" / "French lavender · Chamomile · Shea" / "8 oz pump".
```

**`lavender-body-lotion-3-detail.png`**

```
Detail shot. A small swirl of creamy white lotion on a matte ceramic dish beside the Lavender Body Lotion bottle, with dried lavender sprigs and chamomile flowers arranged loosely on linen. Top-down at a slight angle, macro feel, soft light.
```

## Bath salts

### Eucalyptus Recovery Soak (sizes 12 oz, 32 oz)

**`eucalyptus-recovery-soak-1-hero.png`**

```
Product shot. One 12 oz clear glass apothecary jar of Kind Flames bath salts with a cork lid and a small wooden scoop resting against it, filled with white and pale-green sea salt and epsom crystals flecked with dried eucalyptus leaf, label fully legible, on a seamless warm off-white backdrop with a white marble surface. Soft window light. Label text, exactly: "Eucalyptus Recovery Soak" / "Eucalyptus · Spearmint · Sea salt" / "12 oz". Square, sharp.
```

**`eucalyptus-recovery-soak-2-detail.png`**

```
Detail shot, top-down. The Eucalyptus Recovery Soak jar open with salts spilling from the wooden scoop onto white marble: white and pale-green sea salt and epsom crystals flecked with dried eucalyptus leaf. fresh eucalyptus stems and a spearmint sprig placed loosely beside. Macro feel, soft light.
```

**`eucalyptus-recovery-soak-3-lifestyle.png`**

```
Lifestyle shot. The Eucalyptus Recovery Soak jar on the edge of a filled white bathtub with a few salts dissolving in the water, a rolled white towel, and the Kind Flames Eucalyptus Mint candle (same label system) lit beside it. Evening light, steam softly visible. Labels readable.
```

### Rose & Pink Salt Soak (sizes 12 oz, 32 oz)

**`rose-pink-salt-soak-1-hero.png`**

```
Product shot. One 12 oz clear glass apothecary jar of Kind Flames bath salts with a cork lid and a small wooden scoop resting against it, filled with pale pink Himalayan salt crystals with dried rose petals through it, label fully legible, on a seamless warm off-white backdrop with a white marble surface. Soft window light. Label text, exactly: "Rose & Pink Salt Soak" / "Rose petal · Geranium · Pink salt" / "12 oz". Square, sharp.
```

**`rose-pink-salt-soak-2-detail.png`**

```
Detail shot, top-down. The Rose & Pink Salt Soak jar open with salts spilling from the wooden scoop onto white marble: pale pink Himalayan salt crystals with dried rose petals through it. dried rose petals and a geranium leaf placed loosely beside. Macro feel, soft light.
```

**`rose-pink-salt-soak-3-lifestyle.png`**

```
Lifestyle shot. The Rose & Pink Salt Soak jar on the edge of a filled white bathtub with a few salts dissolving in the water, a rolled white towel, and the Kind Flames Rose Garden candle (same label system) lit beside it. Evening light, steam softly visible. Labels readable.
```

## Gift sets

### Spa Night Set ($48)

**`spa-night-set-1-hero.png`**

```
Product shot. An open natural kraft gift box with the lid leaning behind it, cream crinkle paper inside, containing three Kind Flames products nestled together: an 8 oz Eucalyptus Mint candle jar (label: "Eucalyptus Mint" / "Spearmint · Eucalyptus · Cedar" / "8 oz"), a 12 oz apothecary jar of Eucalyptus Recovery Soak with cork lid (label: "Eucalyptus Recovery Soak" / "Eucalyptus · Spearmint · Sea salt" / "12 oz"), and an 8 oz amber pump bottle of Oat & Honey Hand Lotion (label: "Oat & Honey Hand Lotion" / "Oat milk · Honey · Shea" / "8 oz pump"). A cream card sealed with a cream Kind Flames monogram sticker tucked at the front. Warm off-white backdrop, light oak surface, soft window light. Square, sharp.
```

**`spa-night-set-2-flatlay.png`**

```
Flat lay, top-down. The three Spa Night Set items (Eucalyptus Mint candle, Eucalyptus Recovery Soak jar, Oat & Honey Hand Lotion bottle) laid out on linen beside the empty kraft box and its lid, with a few eucalyptus stems, a rolled white towel and a wooden scoop. Labels readable, same label system. Soft even light.
```

**`spa-night-set-3-gifting.png`**

```
Lifestyle shot. Hands (no face) tying a thin natural jute ribbon around the closed kraft Spa Night Set box, a small cream Kind Flames monogram sticker on the lid, on a light oak table with a sprig of eucalyptus beside it. Warm light, shallow depth of field.
```

### Cozy Evening Trio ($36)

**`cozy-evening-trio-1-hero.png`**

```
Product shot. An open natural kraft gift box, lid leaning behind, cream crinkle paper, holding three 4 oz Kind Flames candle jars in a row with brushed gold lids on: labels read "Cinnamon Spice" / "Orange peel · Cinnamon bark · Clove" / "4 oz", "Vanilla Bliss" / "Brown sugar · Madagascar vanilla · Sandalwood" / "4 oz", and "Pine Forest" / "Juniper · Nordic pine · Moss" / "4 oz". A cream card with a cream Kind Flames monogram sticker at the front. Warm off-white backdrop, light oak surface, soft window light. Square, sharp.
```

**`cozy-evening-trio-2-lit.png`**

```
Lifestyle shot. The three Cozy Evening Trio 4 oz candles (Cinnamon Spice, Vanilla Bliss, Pine Forest) out of the box and lit on a dark wooden table on a winter evening with a wool throw, dried orange slices and a small pine sprig. Labels readable. Warm candlelight, shallow depth of field.
```

**`cozy-evening-trio-3-gifting.png`**

```
Lifestyle shot. The closed kraft Cozy Evening Trio box with a cream Kind Flames monogram sticker on the lid and a thin jute ribbon, a cinnamon stick tucked in the ribbon, on a plaid cloth under softly lit evergreen branches. Holiday mood, warm light.
```

### Corporate Sample Kit ($25, hidden from the shop)

**`corporate-sample-kit-1-hero.png`**

```
Product shot. An open natural kraft box, lid leaning behind, cream crinkle paper, containing three 4 oz Kind Flames candle jars with gold lids (labels: "Lavender Dreams" / "Bergamot · French lavender · Tonka bean" / "4 oz"; "Pine Forest" / "Juniper · Nordic pine · Moss" / "4 oz"; "Vanilla Bliss" / "Brown sugar · Madagascar vanilla · Sandalwood" / "4 oz"), a small 8 oz frosted jar of body scrub with bamboo lid (label: "Brown Sugar & Vanilla Body Scrub" / "8 oz"), and a small cream paper sachet of bath salts with a cream Kind Flames monogram sticker. A cream card at the front reads only "Corporate Sample Kit" in pine-green serif under the logo. Warm off-white backdrop, light oak surface, soft window light. Square, sharp.
```

**`corporate-sample-kit-2-flatlay.png`**

```
Flat lay, top-down, on a clean white desk. The Corporate Sample Kit contents (three 4 oz candles, the scrub jar, the salt sachet) arranged in a neat grid beside the kraft box, a cream card reading "Corporate Sample Kit" under the black logo, a fountain pen and a closed notebook at the edge. Even soft light, business-gift mood.
```

## After generating

Put every file in one folder with the exact names above and tell me the path. I'll:

1. Check each image, crop to square, and match brightness and white balance across the set so the grid looks like one shoot.
2. Export `-800.webp` and `-400.webp` versions into `public/img/products/`, set the hero as the main image and the rest as the gallery for each product, and update the catalog and Firestore.
3. Rebuild and deploy, then the Google Shopping feed regenerates with the new image links.

If you're short on time, skip the `-4-sizes` lineups (the product page lists sizes anyway) and the gift-set `-3-gifting` shots. The `-1-hero` images matter most: the shop grid, the gift guide, Google Shopping and the emails all show them.

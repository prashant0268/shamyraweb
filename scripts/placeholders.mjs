// Placeholder photos for bath & body products until real photography exists.
import sharp from 'sharp';
const items=[['scrub-brown-sugar','#C89A6B','Body Scrub'],['scrub-coffee','#6B4A3A','Body Scrub'],['lotion-oat-honey','#D9C39A','Hand Lotion'],['lotion-lavender','#A99BC9','Body Lotion'],['salt-eucalyptus','#8FBF9F','Bath Soak'],['salt-rose','#D9A3A8','Bath Soak'],['set-spa-night','#2E5A4B','Gift Set'],['set-cozy-trio','#8A4B2E','Gift Set']];
for(const [slug,bg,label] of items){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="${bg}"/><rect x="200" y="240" width="400" height="380" rx="40" fill="#fff" opacity=".18"/><rect x="180" y="200" width="440" height="60" rx="16" fill="#1E231D" opacity=".55"/><text x="400" y="700" font-family="Georgia,serif" font-size="44" fill="#fff" text-anchor="middle" opacity=".9">${label}</text><text x="400" y="750" font-family="Helvetica,Arial" font-size="22" fill="#fff" text-anchor="middle" opacity=".7">photo coming soon</text></svg>`;
  for(const w of [400,800]) await sharp(Buffer.from(svg)).resize(w,w).webp({quality:75}).toFile(`public/img/products/${slug}-${w}.webp`);
}
console.log('placeholders done');

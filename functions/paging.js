/**
 * Cursor paging over a Firestore query, so scans never stop at a fixed limit.
 * Either `query` is already ordered (orderBy) on the field it is cursored by, or pass { orderById: true } to order by
 * document id. `fn(docs)` gets each page; return false from it to stop early.
 */
async function forEachPage(query, fn, { pageSize = 300, orderById = false } = {}) {
  // Lazy so pure modules that import this (marketing.js) still load in unit tests without firebase-admin.
  const base = orderById ? query.orderBy(require("firebase-admin/firestore").FieldPath.documentId()) : query;
  let last = null;
  let total = 0;
  for (;;) {
    const page = await (last ? base.startAfter(last) : base).limit(pageSize).get();
    if (page.empty) break;
    total += page.size;
    if ((await fn(page.docs)) === false) break;
    if (page.size < pageSize) break;
    last = page.docs[page.docs.length - 1];
  }
  return total;
}

module.exports = { forEachPage };

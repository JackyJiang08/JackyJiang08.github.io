// ONE shared comparator for every rendered photo list — the album masonry,
// the featured carousel, popover thumbnail strips, and every scoped
// lightbox — so the four surfaces never disagree:
//   1. date DESCENDING (newest month first; undated photos sink to the
//      bottom)
//   2. within the same month: trailing id number ASCENDING ("-feat" sorts
//      as position 0, before "-01") — a trip plays in hand-numbered
//      narrative order
//   3. tiebreak: id
// The number comes from the id ("…-NN" / "…-feat"), never the caption.
(function () {
  "use strict";

  function trailingNum(p) {
    var id = String(p.id || "");
    if (/-feat$/.test(id)) return 0;
    var m = /-(\d+)$/.exec(id);
    return m ? parseInt(m[1], 10) : Infinity; // un-numbered ids sort last
  }

  function compare(a, b) {
    var d = String(b.date || "").localeCompare(String(a.date || ""));
    if (d !== 0) return d;
    var na = trailingNum(a), nb = trailingNum(b);
    if (na !== nb) return na < nb ? -1 : 1;
    return String(a.id || a.src || "").localeCompare(String(b.id || b.src || ""));
  }

  window.PhotoOrder = {
    compare: compare,
    sort: function (list) { return list.slice().sort(compare); },
  };
})();

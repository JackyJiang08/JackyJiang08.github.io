// Misc. page: live counters on the entry cards, computed from data —
// hobbies from the DOM grid, albums from the PHOTOS manifest, footprints a
// placeholder until the Footprints data arrives.
(function () {
  "use strict";

  var hobbies = document.getElementById("count-hobbies");
  if (hobbies) {
    var n = document.querySelectorAll(".hobby-item").length;
    hobbies.textContent = n + " hobbies";
  }

  var albums = document.getElementById("count-albums");
  if (albums && typeof PHOTOS !== "undefined") {
    albums.textContent = PHOTOS.length + " photos";
  }

  var footprints = document.getElementById("count-footprints");
  if (footprints) {
    if (typeof FOOTPRINTS !== "undefined") {
      var visited = Object.keys(FOOTPRINTS).filter(function (k) {
        return FOOTPRINTS[k].visited;
      }).length;
      footprints.textContent = visited + " countries";
    } else {
      footprints.textContent = "— countries";
    }
  }
})();

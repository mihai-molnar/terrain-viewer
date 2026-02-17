// --- Mobile sidebar toggle ---
function toggleSidebar() {
  var sidebar = document.querySelector(".sidebar");
  var icon = document.getElementById("toggle-icon");
  var btn = document.getElementById("sidebar-toggle");
  var isOpen = sidebar.classList.toggle("open");
  sidebar.classList.toggle("collapsed", !isOpen);
  icon.innerHTML = isOpen ? "&#10005;" : "&#9776;";
  // Stop pulsing once user has found the button
  btn.classList.remove("pulse");
  // Refresh map size when sidebar toggles
  setTimeout(function () { map.invalidateSize(); }, 300);
}

// Auto-collapse sidebar after adding terrain on mobile
function collapseSidebarOnMobile() {
  if (window.innerWidth <= 800) {
    var sidebar = document.querySelector(".sidebar");
    var icon = document.getElementById("toggle-icon");
    sidebar.classList.remove("open");
    sidebar.classList.add("collapsed");
    icon.innerHTML = "&#9776;";
    setTimeout(function () { map.invalidateSize(); }, 300);
  }
}

// --- Projection setup ---
proj4.defs("EPSG:3844",
  "+proj=sterea +lat_0=46 +lon_0=25 +k=0.99975 " +
  "+x_0=500000 +y_0=500000 +ellps=krass " +
  "+towgs84=33.4,-146.6,-76.3,-0.359,-0.053,0.844,-0.84 " +
  "+units=m +no_defs"
);

// --- Color palette ---
var COLORS = [
  "#e74c3c", "#2980b9", "#27ae60", "#f39c12",
  "#8e44ad", "#16a085", "#d35400", "#2c3e50",
  "#c0392b", "#1abc9c", "#e67e22", "#3498db"
];
var colorIndex = 0;

function nextColor() {
  var c = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return c;
}

// --- Map setup ---
var osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 20
});

var satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  maxZoom: 20
});

var map = L.map("map", { layers: [osmLayer] }).setView([45.9, 24.9], 7);

// Layer toggle
var layerControl = L.control({ position: "topright" });
layerControl.onAdd = function () {
  var div = L.DomUtil.create("div", "map-controls");
  div.innerHTML =
    '<button id="btn-street" class="active" onclick="setLayer(false)">Strad\u0103</button>' +
    '<button id="btn-sat" onclick="setLayer(true)">Satelit</button>';
  L.DomEvent.disableClickPropagation(div);
  return div;
};
layerControl.addTo(map);

function setLayer(sat) {
  if (sat) {
    map.removeLayer(osmLayer);
    map.addLayer(satelliteLayer);
  } else {
    map.removeLayer(satelliteLayer);
    map.addLayer(osmLayer);
  }
  document.getElementById("btn-street").classList.toggle("active", !sat);
  document.getElementById("btn-sat").classList.toggle("active", sat);
}

// --- Terrains store ---
var terrains = [];
var terrainIdCounter = 0;

function stereo70ToWgs84(x, y) {
  var result = proj4("EPSG:3844", "EPSG:4326", [x, y]);
  return { lat: result[1], lng: result[0] };
}

function calcStereoArea(points) {
  var area = 0;
  var n = points.length;
  for (var i = 0; i < n; i++) {
    var j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

function calcSegmentLength(p1, p2) {
  var dx = p2.x - p1.x;
  var dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function addTerrain(name, points) {
  terrainIdCounter++;
  var id = terrainIdCounter;
  var color = nextColor();

  // Convert points
  var wgsPoints = points.map(function (p, i) {
    var wgs = stereo70ToWgs84(p.x, p.y);
    return { lat: wgs.lat, lng: wgs.lng, stereoX: p.x, stereoY: p.y, index: i + 1 };
  });

  // Create map layers
  var latlngs = wgsPoints.map(function (p) { return [p.lat, p.lng]; });
  var polygon = L.polygon(latlngs, {
    color: color,
    weight: 3,
    fillColor: color,
    fillOpacity: 0.25
  }).addTo(map);

  var markers = L.layerGroup().addTo(map);
  wgsPoints.forEach(function (p) {
    var icon = L.divIcon({
      className: "",
      html: '<div style="background:' + color + ';color:white;width:22px;height:22px;' +
        'border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">' +
        p.index + '</div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    L.marker([p.lat, p.lng], { icon: icon })
      .bindPopup(
        "<b>" + name + " \u2014 Punct " + p.index + "</b><br>" +
        "Stereo 70: " + p.stereoX.toFixed(3) + " / " + p.stereoY.toFixed(3) + "<br>" +
        "WGS84: " + p.lat.toFixed(6) + "\u00b0 N, " + p.lng.toFixed(6) + "\u00b0 E"
      )
      .addTo(markers);
  });

  // Calculate stats
  var area = calcStereoArea(points);
  var segments = [];
  var perimeter = 0;
  for (var i = 0; i < points.length; i++) {
    var j = (i + 1) % points.length;
    var len = calcSegmentLength(points[i], points[j]);
    segments.push({ from: i + 1, to: (i + 1) < points.length ? i + 2 : 1, length: len });
    perimeter += len;
  }

  var terrain = {
    id: id,
    name: name,
    color: color,
    points: points,
    wgsPoints: wgsPoints,
    polygon: polygon,
    markers: markers,
    area: area,
    perimeter: perimeter,
    segments: segments
  };

  terrains.push(terrain);
  renderTerrainCard(terrain);
  fitAllBounds();
  updateClearButton();
  collapseSidebarOnMobile();
}

function removeTerrain(id) {
  var idx = terrains.findIndex(function (t) { return t.id === id; });
  if (idx === -1) return;

  var terrain = terrains[idx];
  map.removeLayer(terrain.polygon);
  map.removeLayer(terrain.markers);
  terrains.splice(idx, 1);

  var card = document.getElementById("terrain-" + id);
  if (card) card.remove();

  if (terrains.length > 0) {
    fitAllBounds();
  } else {
    map.setView([45.9, 24.9], 7);
  }
  updateClearButton();
}

function clearAllTerrains() {
  terrains.forEach(function (t) {
    map.removeLayer(t.polygon);
    map.removeLayer(t.markers);
  });
  terrains = [];
  colorIndex = 0;
  document.getElementById("terrains-container").innerHTML = "";
  map.setView([45.9, 24.9], 7);
  updateClearButton();
}

function fitAllBounds() {
  if (terrains.length === 0) return;
  var group = L.featureGroup(terrains.map(function (t) { return t.polygon; }));
  map.fitBounds(group.getBounds().pad(0.3));
}

function updateClearButton() {
  document.getElementById("clear-all-row").classList.toggle("visible", terrains.length > 0);
}

// --- Terrain card UI ---
function renderTerrainCard(terrain) {
  var container = document.getElementById("terrains-container");
  var card = document.createElement("div");
  card.className = "terrain-card";
  card.id = "terrain-" + terrain.id;

  var segHtml = terrain.segments.map(function (s) {
    return '<span>' + s.from + '\u2192' + s.to + ': ' + s.length.toFixed(2) + 'm</span>';
  }).join(" ");

  var wgsRows = terrain.wgsPoints.map(function (p) {
    return '<tr><td>' + p.index + '</td><td>' + p.lat.toFixed(6) + '</td><td>' + p.lng.toFixed(6) + '</td></tr>';
  }).join("");

  card.innerHTML =
    '<div class="terrain-header" onclick="toggleTerrainDetails(' + terrain.id + ')">' +
      '<div class="terrain-color" style="background:' + terrain.color + '"></div>' +
      '<div class="terrain-name">' + terrain.name + '</div>' +
      '<div class="terrain-area">' + Math.round(terrain.area) + ' mp</div>' +
      '<span class="terrain-chevron" id="chevron-' + terrain.id + '">\u25B6</span>' +
      '<button class="terrain-remove" onclick="event.stopPropagation();removeTerrain(' + terrain.id + ')" title="\u0218terge">&times;</button>' +
    '</div>' +
    '<div class="terrain-details" id="details-' + terrain.id + '">' +
      '<div class="terrain-stat-row">' +
        '<div class="terrain-stat">' +
          '<div class="terrain-stat-label">Suprafa\u021b\u0103</div>' +
          '<div class="terrain-stat-value">' + Math.round(terrain.area) + ' mp</div>' +
        '</div>' +
        '<div class="terrain-stat">' +
          '<div class="terrain-stat-label">Perimetru</div>' +
          '<div class="terrain-stat-value">' + terrain.perimeter.toFixed(1) + ' m</div>' +
        '</div>' +
      '</div>' +
      '<div class="segment-list"><b>Segmente:</b> ' + segHtml + '</div>' +
      '<table>' +
        '<thead><tr><th>#</th><th>Latitudine</th><th>Longitudine</th></tr></thead>' +
        '<tbody>' + wgsRows + '</tbody>' +
      '</table>' +
    '</div>';

  container.appendChild(card);
}

function toggleTerrainDetails(id) {
  var details = document.getElementById("details-" + id);
  var chevron = document.getElementById("chevron-" + id);
  details.classList.toggle("open");
  chevron.classList.toggle("open");
}

// --- Manual input ---
var pointCount = 0;

function addPointRow(x, y) {
  pointCount++;
  var id = pointCount;
  var container = document.getElementById("points-container");
  var row = document.createElement("div");
  row.className = "point-row";
  row.id = "point-" + id;
  row.innerHTML =
    '<span class="point-label">' + id + '</span>' +
    '<input type="text" placeholder="241953.403" data-field="x" value="' + (x || "") + '">' +
    '<input type="text" placeholder="532269.41" data-field="y" value="' + (y || "") + '">' +
    '<button class="btn-icon" onclick="removePoint(' + id + ')" title="\u0218terge">&times;</button>';
  container.appendChild(row);
}

function removePoint(id) {
  var row = document.getElementById("point-" + id);
  if (row) row.remove();
  var rows = document.querySelectorAll("#points-container .point-row");
  rows.forEach(function (row, i) {
    row.querySelector(".point-label").textContent = i + 1;
  });
}

function getManualPoints() {
  var rows = document.querySelectorAll("#points-container .point-row");
  var points = [];
  var valid = true;

  rows.forEach(function (row, i) {
    var xInput = row.querySelector('[data-field="x"]');
    var yInput = row.querySelector('[data-field="y"]');
    var x = parseFloat(xInput.value.replace(/,/g, "").trim());
    var y = parseFloat(yInput.value.replace(/,/g, "").trim());

    xInput.classList.remove("invalid");
    yInput.classList.remove("invalid");

    if (isNaN(x)) { xInput.classList.add("invalid"); valid = false; }
    if (isNaN(y)) { yInput.classList.add("invalid"); valid = false; }

    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x: x, y: y });
    }
  });

  return valid ? points : null;
}

function addManualTerrain() {
  hideError();
  var points = getManualPoints();

  if (!points) {
    showError("Verifica\u021bi valorile introduse. Toate c\u00e2mpurile trebuie s\u0103 fie numere.");
    return;
  }

  if (points.length < 3) {
    showError("Sunt necesare minim 3 puncte pentru a forma un teren.");
    return;
  }

  addTerrain("Teren manual #" + (terrains.length + 1), points);

  // Clear manual inputs
  document.getElementById("points-container").innerHTML = "";
  pointCount = 0;
  addPointRow();
  addPointRow();
  addPointRow();
}

// --- Errors ---
function showError(msg) {
  var el = document.getElementById("error");
  el.textContent = msg;
  el.classList.add("visible");
}

function hideError() {
  document.getElementById("error").classList.remove("visible");
}

// --- PDF Upload ---
var uploadZone = document.getElementById("upload-zone");

uploadZone.addEventListener("dragover", function (e) {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", function () {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", function (e) {
  e.preventDefault();
  uploadZone.classList.remove("dragover");
  var files = Array.from(e.dataTransfer.files).filter(function (f) {
    return f.type === "application/pdf";
  });
  if (files.length > 0) {
    processMultiplePdfs(files);
  } else {
    setUploadStatus("fail", "V\u0103 rug\u0103m selecta\u021bi fi\u0219iere PDF.");
  }
});

function handlePdfUpload(event) {
  var files = Array.from(event.target.files);
  if (files.length > 0) processMultiplePdfs(files);
  event.target.value = "";
}

function setUploadStatus(type, msg) {
  var el = document.getElementById("upload-status");
  el.className = "upload-status " + type;
  el.textContent = msg;
}

async function processMultiplePdfs(files) {
  setUploadStatus("loading", "Se proceseaz\u0103 " + files.length + " fi\u0219ier" + (files.length > 1 ? "e" : "") + "...");

  var success = 0;
  var failed = 0;

  for (var i = 0; i < files.length; i++) {
    try {
      var points = await extractPointsFromPdf(files[i]);
      if (points.length >= 3) {
        var name = files[i].name.replace(/\.pdf$/i, "");
        addTerrain(name, points);
        success++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error("PDF parse error (" + files[i].name + "):", err);
      failed++;
    }
  }

  if (success > 0 && failed === 0) {
    setUploadStatus("success", success + " teren" + (success > 1 ? "uri" : "") + " ad\u0103ugat" + (success > 1 ? "e" : "") + " pe hart\u0103.");
  } else if (success > 0 && failed > 0) {
    setUploadStatus("success", success + " reu\u0219it" + (success > 1 ? "e" : "") + ", " + failed + " e\u0219uat" + (failed > 1 ? "e" : "") + ".");
  } else {
    setUploadStatus("fail", "Nu s-au putut extrage coordonate din niciun fi\u0219ier.");
  }
}

async function extractPointsFromPdf(file) {
  var arrayBuffer = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  var fullText = "";
  for (var i = 1; i <= pdf.numPages; i++) {
    var page = await pdf.getPage(i);
    var content = await page.getTextContent();
    var pageText = content.items.map(function (item) { return item.str; }).join(" ");
    fullText += pageText + "\n";
  }

  return parseCFCoordinates(fullText);
}

function parseRomanianNumber(str) {
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

function parseCFCoordinates(text) {
  var coordPat = "(\\d{1,3}\\.?\\d{3},\\d{1,3})";
  var rowRegex = new RegExp(
    "\\b(\\d{1,2})\\s+" + coordPat + "\\s+" + coordPat,
    "g"
  );

  var points = new Map();
  var match;

  while ((match = rowRegex.exec(text)) !== null) {
    var pointNum = parseInt(match[1]);
    var x = parseRomanianNumber(match[2]);
    var y = parseRomanianNumber(match[3]);

    if (x > 100000 && x < 900000 && y > 100000 && y < 900000) {
      if (!points.has(pointNum)) {
        points.set(pointNum, { x: x, y: y });
      }
    }
  }

  return Array.from(points.entries())
    .sort(function (a, b) { return a[0] - b[0]; })
    .map(function (entry) { return entry[1]; });
}

// --- Init ---
addPointRow();
addPointRow();
addPointRow();

// Pulse the toggle button on mobile to guide users
if (window.innerWidth <= 800) {
  document.getElementById("sidebar-toggle").classList.add("pulse");
}

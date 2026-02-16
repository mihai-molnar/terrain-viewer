# Terrain Finder — TODO

## Phase 1: Project Setup

- [x] Create `index.html` with basic HTML structure
- [x] Add Leaflet.js and proj4js via CDN
- [x] Add basic CSS styling (responsive layout, input form + map area)

## Phase 2: Coordinate Conversion

- [x] Define EPSG:3844 (Stereo 70) projection in proj4js
- [x] Build conversion function: Stereo 70 X/Y → WGS84 lat/lng
- [ ] Verify conversion accuracy against known coordinates (Șiria sample data)

## Phase 3: Input Form

- [x] Create input fields for coordinate pairs (X and Y per point)
- [x] Add "Add Point" / "Remove Point" buttons for variable number of points
- [x] Add "Show on Map" button to trigger rendering
- [x] Validate input (numeric values, minimum 3 points for a polygon)

## Phase 4: Map Rendering

- [x] Initialize Leaflet map with OpenStreetMap tiles
- [x] Convert all input points from Stereo 70 to WGS84
- [x] Draw polygon overlay connecting the converted points
- [x] Style polygon (border color, fill color with transparency)
- [x] Add numbered markers at each corner point
- [x] Auto-fit map bounds to show the entire terrain

## Phase 5: Info Display

- [x] Show total area (from input or calculated)
- [x] Show converted WGS84 coordinates in a results panel
- [x] Display segment lengths between points

## Phase 6: Polish

- [x] Add satellite/street view toggle (ESRI satellite tiles)
- [x] Add sample data button (pre-fill with CF 317311 Șiria coordinates)
- [x] Responsive design for mobile
- [x] Error handling and user-friendly messages
- [x] Add a "Clear" / "Reset" button

## Post-MVP Ideas

- [ ] Auto-parse pasted CF text to extract coordinate table
- [ ] Support multiple terrains on one map
- [ ] Export as GeoJSON
- [ ] Copy WGS84 coordinates to clipboard
- [ ] Print-friendly layout

# Terrain Finder — Project Plan

## Overview

A single-page web app that takes boundary coordinates from Romanian "Extras de Carte Funciară" documents (land registry extracts) and visualizes the terrain parcel on an interactive map with a polygon overlay.

## Problem

Romanian land registry extracts (CF) contain terrain boundary points in the **Stereo 70** coordinate system (EPSG:3844). These raw numbers are meaningless to most people — there's no easy way to see where the terrain actually is on a map or what it looks like.

## Solution

A lightweight browser app where users paste the Stereo 70 coordinate points from their CF document and instantly see the terrain plotted on a real map.

## Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Map rendering | **Leaflet.js** | Free, lightweight (~30KB), no API key needed |
| Map tiles | **OpenStreetMap** + optional satellite (ESRI) | Free, no billing required |
| Coordinate conversion | **proj4js** | Supports EPSG:3844 (Stereo 70) → WGS84 out of the box |
| Frontend | **Vanilla HTML/CSS/JS** | Single file, no build tools, no framework overhead |
| Backend | **None** | All computation runs client-side |

## Why Not Google Maps API

- Google removed the $200/mo free credit in March 2025; now charges ~$7/1,000 map loads
- Requires Google Cloud account, billing setup, API key management
- Leaflet + OSM provides identical polygon/overlay capabilities for free
- Overkill for a small personal tool

## Architecture

```
Single HTML file (index.html)
├── Inline CSS (styles)
├── Leaflet.js (CDN)
├── proj4js (CDN)
└── App logic:
    ├── Input parser — extracts X/Y Stereo 70 coordinate pairs
    ├── Coordinate converter — Stereo 70 → WGS84 via proj4js
    ├── Map renderer — Leaflet map centered on the terrain
    └── Polygon overlay — draws and styles the terrain boundary
```

## Features

### Core (MVP)

1. **Coordinate input form** — user enters Stereo 70 X/Y pairs (one per point)
2. **Stereo 70 → WGS84 conversion** — using proj4js with EPSG:3844 definition
3. **Map display** — Leaflet map centered and zoomed to fit the terrain
4. **Polygon overlay** — terrain boundary drawn as a colored polygon with opacity
5. **Corner markers** — numbered markers at each boundary point
6. **Area display** — show the total area in square meters

### Nice-to-Have (Post-MVP)

- Toggle between street map and satellite imagery
- Display segment lengths along each edge
- Copy converted WGS84 coordinates to clipboard
- Export terrain as GeoJSON
- Parse coordinates directly from pasted CF text (auto-detect the table format)
- Support multiple terrains on the same map
- Print-friendly view

## Coordinate System Details

Romanian CF documents use **Stereo 70** (EPSG:3844):
- Projection: Oblique Stereographic
- Origin: lat 46°N, lon 25°E
- False origin: X=500000, Y=500000
- Ellipsoid: Krassowsky 1940
- Datum: Pulkovo 1942(58)

proj4js definition:
```
+proj=sterea +lat_0=46 +lon_0=25 +k=0.99975
+x_0=500000 +y_0=500000 +ellps=krass
+towgs84=2.329,-147.042,-92.08,0.309,-0.325,-0.497,5.69
+units=m +no_defs
```

## Sample Data (from CF 317311 Șiria)

| Point | X (Northing) | Y (Easting) |
|-------|-------------|-------------|
| 1 | 241,953.403 | 532,269.410 |
| 2 | 241,912.453 | 532,197.357 |
| 3 | 241,920.216 | 532,193.939 |
| 4 | 241,961.248 | 532,266.139 |

- Total area: 700 mp
- Shape: narrow strip (~83m x ~8.5m)
- Category: vineyard (vie), intravilan, Șiria, Arad

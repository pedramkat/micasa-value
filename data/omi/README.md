# OMI Data Import Instructions

This directory contains Italian Real Estate Market Observatory (Osservatorio del Mercato Immobiliare) data.

## Directory Structure

```
data/omi/
├── csv/          # Place CSV files here
│   ├── Quotazioni Immobiliari : Valori di Mercato - Semestre 2025/1 - elaborazione del 15-OTT-25 .CSV
│   └── Quotazioni Immobiliari : Informazioni di Zona OMI - Semestre 2025/1 - elaborazione del 15-OTT-25 .CSV
└── kml/          # Place KML files here
    ├── A182.kml
    ├── A183.kml
    └── ... (other municipality KML files)
```

## How to Import Data

### 1. Place your CSV files in `data/omi/csv/`

Copy the two CSV files:
- Market values CSV (Valori di Mercato)
- Zone information CSV (Informazioni di Zona)

### 2. Place your KML files in `data/omi/kml/`

Copy all municipality KML files (e.g., A182.kml, A183.kml, etc.)

### 3. Run the import commands

```bash
# Import market values (price ranges)
npm run import:omi:market-values

# Import zone information (zone descriptions)
npm run import:omi:zones

# Import KML polygons (geographic boundaries)
npm run import:omi:polygons

# Clear all OMI data (use with caution)
npx prisma db execute --file scripts/clear-omi-data.sql
```

## What Gets Imported

### Market Values
- Property type prices per square meter
- Min/max purchase prices (€/m²)
- Min/max rental prices (€/m²)
- Zone and municipality information

### Zones
- Zone descriptions (e.g., "CENTRO URBANO")
- Zone codes and classifications
- Municipality details

### Polygons
- Geographic boundaries for each zone
- Stored as GeoJSON format in database
- Enables address-to-zone mapping

## Notes

- The import scripts automatically handle tab-delimited CSV files
- KML files are converted to GeoJSON polygons
- Update the `SEMESTER` variable in scripts if importing different semester data
- All imports use upsert operations for polygons to avoid duplicates

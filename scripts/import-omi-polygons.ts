import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parseStringPromise } from 'xml2js';
import prisma from '../lib/prisma';

const KML_DIR = path.join(process.cwd(), 'data/omi/kml');
const SEMESTER = '2025/1'; // Update this for different semesters

interface KMLCoordinate {
  coordinates: string[];
}

interface KMLPlacemark {
  name: string[];
  description?: string[];
  Polygon?: Array<{
    outerBoundaryIs?: Array<{
      LinearRing?: KMLCoordinate[];
    }>;
  }>;
  MultiGeometry?: Array<{
    Polygon?: Array<{
      outerBoundaryIs?: Array<{
        LinearRing?: KMLCoordinate[];
      }>;
    }>;
  }>;
}

function parseCoordinates(coordString: string): number[][] {
  // KML coordinates are in format: lon,lat,alt lon,lat,alt ...
  // Convert to GeoJSON format: [lon, lat]
  return coordString
    .trim()
    .split(/\s+/)
    .map(coord => {
      const [lon, lat] = coord.split(',').map(parseFloat);
      return [lon, lat];
    });
}

function extractPolygonFromPlacemark(placemark: KMLPlacemark): any {
  // Handle single Polygon
  if (placemark.Polygon) {
    const ring = placemark.Polygon[0]?.outerBoundaryIs?.[0]?.LinearRing?.[0];
    if (ring?.coordinates?.[0]) {
      const coords = parseCoordinates(ring.coordinates[0]);
      return {
        type: 'Polygon',
        coordinates: [coords]
      };
    }
  }

  // Handle MultiGeometry with multiple Polygons
  if (placemark.MultiGeometry?.[0]?.Polygon) {
    const polygons = placemark.MultiGeometry[0].Polygon.map(polygon => {
      const ring = polygon?.outerBoundaryIs?.[0]?.LinearRing?.[0];
      if (ring?.coordinates?.[0]) {
        const coords = parseCoordinates(ring.coordinates[0]);
        return [coords];
      }
      return null;
    }).filter(Boolean);

    if (polygons.length === 1) {
      return {
        type: 'Polygon',
        coordinates: polygons[0]
      };
    } else if (polygons.length > 1) {
      return {
        type: 'MultiPolygon',
        coordinates: polygons
      };
    }
  }

  return null;
}

async function importKMLFile(filename: string) {
  const kmlPath = path.join(KML_DIR, filename);
  const kmlContent = fs.readFileSync(kmlPath, 'utf-8');

  // Parse KML XML
  const kmlData = await parseStringPromise(kmlContent);

  // Extract placemarks
  const placemarks = kmlData?.kml?.Document?.[0]?.Folder?.[0]?.Placemark || 
                     kmlData?.kml?.Document?.[0]?.Placemark || [];

  if (placemarks.length === 0) {
    console.warn(`⚠️  No placemarks found in ${filename}`);
    return 0;
  }

  let imported = 0;

  // Get comune code from filename (e.g., A182.kml -> A182)
  const comuneAmm = filename.replace('.kml', '').replace('.KML', '');

  for (const placemark of placemarks) {
    const name = placemark.name?.[0] || '';
    const description = placemark.description?.[0] || '';
    
    
    // Extract linkZona and zona from name or description
    // Name format: "PISA - Zona OMI D6"
    const zonaMatch = name.match(/Zona OMI ([A-Z]\d+)/);
    const zona = zonaMatch?.[1] || null;
    
    // Try to extract linkZona from description or extended data
    let linkZona = '';
    const linkZonaMatch = description?.match(/([A-Z]{2}\d{8})/);
    if (linkZonaMatch) {
      linkZona = linkZonaMatch[1];
    } else if (placemark.ExtendedData?.[0]?.Data) {
      // Check extended data for linkZona in Data array
      const dataArray = placemark.ExtendedData[0].Data;
      const linkZonaData = dataArray.find((d: any) => 
        d.$?.name === 'LINKZONA' || 
        d.$?.name === 'LinkZona' || 
        d.$?.name === 'linkZona' ||
        d.displayName?.[0] === 'LinkZONA'
      );
      if (linkZonaData?.value?.[0]) {
        linkZona = linkZonaData.value[0];
      }
    }

    const polygonData = extractPolygonFromPlacemark(placemark);

    // If linkZona is empty, try to look it up from OmiZone table
    if (!linkZona && zona && comuneAmm) {
      const zoneRecord = await prisma.omiZone.findFirst({
        where: {
          comuneAmm: comuneAmm,
          zona: zona,
          semester: SEMESTER
        },
        select: {
          linkZona: true
        }
      });
      if (zoneRecord) {
        linkZona = zoneRecord.linkZona;
      }
    }

    if (!polygonData || !linkZona) {
      console.warn(`⚠️  Skipping placemark with missing data: ${name} (zona: ${zona}, linkZona: ${linkZona}, hasPolygon: ${!!polygonData})`);
      continue;
    }

    try {
      await prisma.omiPolygon.upsert({
        where: {
          comuneAmm_linkZona_semester: {
            comuneAmm,
            linkZona,
            semester: SEMESTER
          }
        },
        create: {
          comuneAmm,
          linkZona,
          zona,
          zonaDescr: description || null,
          polygonData,
          kmlFileName: filename,
          semester: SEMESTER
        },
        update: {
          zona,
          zonaDescr: description || null,
          polygonData,
          kmlFileName: filename
        }
      });
      imported++;
    } catch (error) {
      console.error(`❌ Error importing polygon for ${linkZona}:`, error);
    }
  }

  return imported;
}

async function importAllPolygons() {
  console.log('📍 Starting OMI Polygons import...');

  const files = fs.readdirSync(KML_DIR).filter(f => 
    f.toLowerCase().endsWith('.kml')
  );

  if (files.length === 0) {
    console.error('❌ No KML files found in data/omi/kml/');
    console.log('Expected files: A182.kml, etc.');
    process.exit(1);
  }

  console.log(`📄 Found ${files.length} KML files`);

  let totalImported = 0;

  for (const file of files) {
    console.log(`\n📂 Processing ${file}...`);
    const count = await importKMLFile(file);
    totalImported += count;
    console.log(`✓ Imported ${count} polygons from ${file}`);
  }

  console.log(`\n✅ All imports completed!`);
  console.log(`   Total polygons imported: ${totalImported}`);
}

importAllPolygons()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

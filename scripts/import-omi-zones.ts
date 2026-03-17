import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma';

const CSV_DIR = path.join(process.cwd(), 'data/omi/csv');
const SEMESTER = '2025/1'; // Update this for different semesters

async function importZones() {
  console.log('🗺️  Starting OMI Zones import...');
  
  // Find CSV file matching pattern "QI_20251_ZONE"
  const files = fs.readdirSync(CSV_DIR);
  const zoneFile = files.find(f => 
    f.includes('QI_20251_ZONE') &&
    (f.endsWith('.CSV') || f.endsWith('.csv'))
  );

  if (!zoneFile) {
    console.error('❌ Zone information CSV file not found in data/omi/csv/');
    console.log('Expected filename pattern: "QI_20251_ZONE.CSV" or "QI_20251_ZONE.csv"');
    process.exit(1);
  }

  console.log(`📄 Found file: ${zoneFile}`);

  const csvPath = path.join(CSV_DIR, zoneFile);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV with semicolon delimiter
  const records = parse(fileContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  }) as any[];

  console.log(`📊 Found ${records.length} records total`);
  
  // Filter for G702 only
  const filteredRecords = records.filter((r: any) => r.Comune_amm === 'G702');
  console.log(`📊 Found ${filteredRecords.length} records for G702 to import`);

  let imported = 0;
  let errors = 0;

  for (const record of filteredRecords) {
    try {
      await prisma.omiZone.upsert({
        where: {
          linkZona_semester: {
            linkZona: record.LinkZona,
            semester: SEMESTER
          }
        },
        update: {
          areaTerritorial: record.Area_territoriale,
          regione: record.Regione,
          provincia: record.Prov,
          comuneIstat: record.Comune_ISTAT,
          comuneCat: record.Comune_cat || null,
          sezione: record.Sez || null,
          comuneAmm: record.Comune_amm || null,
          comuneDescrizione: record.Comune_descrizione,
          fascia: record.Fascia,
          zonaDescr: record.Zona_Descr,
          zona: record.Zona,
          codTipPrev: record.Cod_tip_prev || null,
          descrTipPrev: record.Descr_tip_prev || null,
          statoPrev: record.Stato_prev || null,
          microzona: record.Microzona || null
        },
        create: {
          areaTerritorial: record.Area_territoriale,
          regione: record.Regione,
          provincia: record.Prov,
          comuneIstat: record.Comune_ISTAT,
          comuneCat: record.Comune_cat || null,
          sezione: record.Sez || null,
          comuneAmm: record.Comune_amm || null,
          comuneDescrizione: record.Comune_descrizione,
          fascia: record.Fascia,
          zonaDescr: record.Zona_Descr,
          zona: record.Zona,
          linkZona: record.LinkZona,
          codTipPrev: record.Cod_tip_prev || null,
          descrTipPrev: record.Descr_tip_prev || null,
          statoPrev: record.Stato_prev || null,
          microzona: record.Microzona || null,
          semester: SEMESTER
        }
      });
      imported++;
      
      if (imported % 50 === 0) {
        console.log(`✓ Imported ${imported} records...`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error importing record:`, error);
    }
  }

  console.log(`\n✅ Import completed!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Errors: ${errors}`);
}

importZones()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

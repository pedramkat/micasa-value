import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import prisma from '../lib/prisma';

const CSV_DIR = path.join(process.cwd(), 'data/omi/csv');
const SEMESTER = '2025/1'; // Update this for different semesters

async function importMarketValues() {
  console.log('🏠 Starting OMI Market Values import...');
  
  // Find CSV file matching pattern "QI_20251_VALORI"
  const files = fs.readdirSync(CSV_DIR);
  console.log('📂 Files in CSV directory:', files);
  
  const marketValueFile = files.find(f => {
    const matches = f.includes('QI_20251_VALORI') && 
                   (f.endsWith('.CSV') || f.endsWith('.csv'));
    console.log(`   Checking ${f}: ${matches ? '✓' : '✗'}`);
    return matches;
  });

  if (!marketValueFile) {
    console.error('❌ Market values CSV file not found in data/omi/csv/');
    console.log('Expected filename pattern: "QI_20251_VALORI.CSV" or "QI_20251_VALORI.csv"');
    process.exit(1);
  }

  console.log(`📄 Found file: ${marketValueFile}`);

  const csvPath = path.join(CSV_DIR, marketValueFile);
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV with semicolon delimiter
  const records = parse(fileContent, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    trim: true
  }) as any[];

  console.log(`📊 Found ${records.length} records total`);
  
  // Filter for G702 only
  const filteredRecords = records.filter((r: any) => r.Comune_amm === 'G702');
  console.log(`📊 Found ${filteredRecords.length} records for G702 to import`);

  let imported = 0;
  let errors = 0;

  for (const record of filteredRecords) {
    try {
      await prisma.omiMarketValue.upsert({
        where: {
          linkZona_codTipologia_semester: {
            linkZona: record.LinkZona,
            codTipologia: record.Cod_Tip,
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
          zona: record.Zona,
          descrTipologia: record.Descr_Tipologia,
          stato: record.Stato,
          statoPrev: record.Stato_prev || null,
          comprMin: record.Compr_min ? parseFloat(record.Compr_min) : null,
          comprMax: record.Compr_max ? parseFloat(record.Compr_max) : null,
          supNlCompr: record.Sup_NL_compr || null,
          locMin: record.Loc_min ? parseFloat(record.Loc_min) : null,
          locMax: record.Loc_max ? parseFloat(record.Loc_max) : null,
          supNlLoc: record.Sup_NL_loc || null
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
          zona: record.Zona,
          linkZona: record.LinkZona,
          codTipologia: record.Cod_Tip,
          descrTipologia: record.Descr_Tipologia,
          stato: record.Stato,
          statoPrev: record.Stato_prev || null,
          comprMin: record.Compr_min ? parseFloat(record.Compr_min) : null,
          comprMax: record.Compr_max ? parseFloat(record.Compr_max) : null,
          supNlCompr: record.Sup_NL_compr || null,
          locMin: record.Loc_min ? parseFloat(record.Loc_min) : null,
          locMax: record.Loc_max ? parseFloat(record.Loc_max) : null,
          supNlLoc: record.Sup_NL_loc || null,
          semester: SEMESTER
        }
      });
      imported++;
      
      if (imported % 100 === 0) {
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

importMarketValues()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

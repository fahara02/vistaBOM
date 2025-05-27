// Script to identify and fix duplicate root categories
import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

// Fixed database name
const targetDb = 'vbom';

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL must be set in .env');
  process.exit(1);
}

// Connect to the database
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : true
});

async function fixDuplicateCategories() {
  try {
    console.log('Connected to database, checking for duplicate categories...');
    
    // First, check for duplicate root categories
    const duplicateCheck = await sql`
      SELECT category_name, COUNT(*) as count, array_agg(category_id) as ids, 
             array_agg(created_at) as created_dates,
             array_agg(created_by) as created_by_ids
      FROM "Category"
      WHERE parent_id IS NULL
      GROUP BY category_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
    `;
    
    // If duplicates exist, we need to handle them
    if (duplicateCheck.length > 0) {
      console.log('\n⚠️ DUPLICATE ROOT CATEGORIES DETECTED ⚠️');
      console.log('The following root categories have duplicates:');
      console.log('--------------------------------------------');
      
      duplicateCheck.forEach(dup => {
        console.log(`"${dup.category_name}" appears ${dup.count} times with IDs: ${dup.ids.join(', ')}`);
      });
      
      console.log('\nFixing duplicates automatically...');
      
      // For each duplicate set, keep the newest one and update the rest
      for (const dup of duplicateCheck) {
        // Get the newest one by created_at (converting properly to dates)
        const dates = dup.created_dates.map(d => new Date(d));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        const newestIndex = dates.findIndex(d => d.getTime() === maxDate.getTime());
        const keepId = dup.ids[newestIndex];
        console.log(`  - Found newest: ${keepId} created at ${dates[newestIndex].toISOString()}`);
        
        console.log(`For "${dup.category_name}": keeping ${keepId} (newest) and updating others`);
        
        // Update all others to have modified names
        for (const id of dup.ids) {
          if (id !== keepId) {
            // Update the duplicate to have a modified name
            await sql`
              UPDATE "Category"
              SET category_name = ${`${dup.category_name} (duplicate)`},
                  updated_at = NOW()
              WHERE category_id = ${id}
            `;
            console.log(`  - Updated ${id} to have name "${dup.category_name} (duplicate)"`);
          }
        }
      }
      
      console.log('\nDuplicates fixed successfully.');
    } else {
      console.log('No duplicate root categories found. Your database is clean!');
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing duplicate categories:', error);
    return false;
  } finally {
    // Always close the connection
    await sql.end();
  }
}

// Run the fix function
fixDuplicateCategories()
  .then(success => {
    if (success) {
      console.log('\nNow you can run "npm run db:update" to apply the constraints.');
    } else {
      console.error('Failed to fix duplicate categories.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

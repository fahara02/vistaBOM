// Update category constraints using porsager/postgres
import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

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

async function updateCategoryConstraints() {
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
    
    // If duplicates exist, we need to handle them first
    if (duplicateCheck.length > 0) {
      console.log('\n⚠️ DUPLICATE ROOT CATEGORIES DETECTED ⚠️');
      console.log('The following root categories have duplicates:');
      console.log('--------------------------------------------');
      
      duplicateCheck.forEach(dup => {
        console.log(`"${dup.category_name}" appears ${dup.count} times with IDs: ${dup.ids.join(', ')}`);
      });
      
      console.log('\nYou need to resolve these duplicates before applying the constraint.');
      console.log('Options:');
      console.log('1. Manually update the categories in the database to have different names');
      console.log('2. Keep the newest one and update older ones to have a parent category');
      console.log('3. Run this script with the --fix flag to automatically handle duplicates');
      
      const args = process.argv.slice(2);
      if (args.includes('--fix')) {
        console.log('\nFixing duplicates automatically...');
        
        // For each duplicate set, keep the newest one and update the rest
        for (const dup of duplicateCheck) {
          // Get the newest one by created_at
          const dates = dup.created_dates.map(d => new Date(d));
          const newestIndex = dates.indexOf(new Date(Math.max(...dates)));
          const keepId = dup.ids[newestIndex];
          
          console.log(`For "${dup.category_name}": keeping ${keepId} (newest) and updating others`);
          
          // Update all others to have this one as parent
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
        
        console.log('Duplicates fixed successfully.');
      } else {
        console.log('\nRun this script with --fix flag to automatically handle duplicates:');
        console.log('npm run db:update -- --fix');
        return false;
      }
    }
    
    // Now proceed with constraint updates
    console.log('\nUpdating category constraints...');
    
    // Check and drop existing constraints to ensure clean installation
    await sql`
      DO $$ 
      BEGIN
        -- Check and drop old style constraint
        IF EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'category_parent_id_category_name_key' 
          AND conrelid = 'public."Category"'::regclass
        ) THEN
          ALTER TABLE "Category" DROP CONSTRAINT category_parent_id_category_name_key;
          RAISE NOTICE 'Dropped old constraint: category_parent_id_category_name_key';
        END IF;
        
        -- Check and drop the parent constraint if it exists
        IF EXISTS (
          SELECT 1 
          FROM pg_constraint 
          WHERE conname = 'unique_category_with_parent' 
          AND conrelid = 'public."Category"'::regclass
        ) THEN
          ALTER TABLE "Category" DROP CONSTRAINT unique_category_with_parent;
          RAISE NOTICE 'Dropped constraint: unique_category_with_parent';
        END IF;
        
        -- Check and drop root category index if it exists
        IF EXISTS (
          SELECT 1 
          FROM pg_indexes 
          WHERE indexname = 'unique_root_category'
        ) THEN
          DROP INDEX unique_root_category;
          RAISE NOTICE 'Dropped index: unique_root_category';
        END IF;
      END $$;
    `;
    
    console.log('Dropped any existing constraints');
    
    // Add the standard unique constraint for categories with parents
    await sql`
      ALTER TABLE "Category" 
      ADD CONSTRAINT unique_category_with_parent UNIQUE (parent_id, category_name);
    `;
    
    // For partial indexes with a WHERE clause, we need to use CREATE UNIQUE INDEX instead
    await sql`
      CREATE UNIQUE INDEX unique_root_category
      ON "Category" (category_name)
      WHERE parent_id IS NULL;
    `;
    
    console.log('Successfully added new constraints:');
    console.log('1. unique_category_with_parent - For categories with parents');
    console.log('2. unique_root_category - For root categories (null parent_id)');
    
    return true;
  } catch (error) {
    console.error('Error updating category constraints:', error);
    return false;
  } finally {
    // Always close the connection
    await sql.end();
  }
}

// Run the update function
updateCategoryConstraints()
  .then(success => {
    if (success) {
      console.log('Category constraints updated successfully.');
    } else {
      console.error('Failed to update category constraints.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });

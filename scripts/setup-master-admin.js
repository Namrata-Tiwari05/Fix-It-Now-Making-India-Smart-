/**
 * FixItNow — Master Admin Provisioning Script
 * 
 * Uses the Supabase Admin API (Service Role) to create the initial Master Admin account
 * in Supabase Auth and upsert the matching profile record in public.profiles.
 * 
 * Usage:
 *   node scripts/setup-master-admin.js
 */

import { supabaseAdminClient } from '../server/src/config/supabase.js';
import { config } from '../server/src/config/env.js';

if (!supabaseAdminClient) {
  console.error('❌ Error: Supabase Admin Client could not be initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = supabaseAdminClient;

async function provisionAccount(account) {
  console.log(`\n🔹 Provisioning ${account.role.toUpperCase()}: ${account.email}...`);

  try {
    // 1. Check if user already exists in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.warn('   ⚠️ Could not list auth users:', listError.message);
    }

    let authUser = users ? users.find(u => u.email?.toLowerCase() === account.email.toLowerCase()) : null;

    if (authUser) {
      console.log(`   ℹ️ User ${account.email} already exists in Supabase Auth. Updating credentials...`);
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          name: account.name,
          municipality_id: account.municipality_id || null
        }
      });
      if (updateError) throw updateError;
      authUser = updated.user;
    } else {
      console.log(`   ✨ Creating new Supabase Auth user for ${account.email}...`);
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          name: account.name,
          municipality_id: account.municipality_id || null
        }
      });
      if (createError) throw createError;
      authUser = created.user;
    }

    console.log(`   ✅ Auth user ID: ${authUser.id}`);

    // 2. Upsert profile in public.profiles table
    const profileRecord = {
      id: authUser.id,
      email: account.email,
      role: account.role,
      name: account.name,
      phone: account.phone || null,
      aadhaar_masked: account.aadhaar_masked || null,
      municipality_id: account.municipality_id || null,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileRecord, { onConflict: 'email' });

    if (profileError) {
      console.warn(`   ⚠️ Notice on profiles table: ${profileError.message}`);
      console.log('   (Note: Once table is created in Supabase SQL editor via supabase/fixitnow_complete.sql, this profile record will link automatically)');
    } else {
      console.log(`   ✅ Profiles record synchronized for ${account.email}`);
    }

    return authUser;
  } catch (err) {
    console.error(`   ❌ Failed to provision ${account.email}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('===========================================================');
  console.log('🏛️  FixItNow — Master Admin & Staff Setup Engine');
  console.log(`   Target Supabase: ${config.supabase.url}`);
  console.log('===========================================================');

  // Master Admin (Authoritative Primary Account)
  await provisionAccount({
    email: 'masteradmin@fixitnow.gov',
    password: 'FixItNow@2026!',
    role: 'master_admin',
    name: 'National Command Admin',
    phone: '+91-9811000001',
    aadhaar_masked: 'XXXX-XXXX-9999',
    municipality_id: null
  });

  // Municipal Admin (Gorakhpur)
  await provisionAccount({
    email: 'admin.gmc@gorakhpurmc.gov.in',
    password: 'FixItNow@2026!',
    role: 'municipal_admin',
    name: 'Rajesh Verma (Municipal Admin)',
    phone: '+91-9415000002',
    aadhaar_masked: 'XXXX-XXXX-8888',
    municipality_id: '11111111-1111-1111-1111-111111111111'
  });

  // Field Officer (Gorakhpur Roads)
  await provisionAccount({
    email: 'officer.roads@gorakhpurmc.gov.in',
    password: 'FixItNow@2026!',
    role: 'field_officer',
    name: 'Inspector Suresh Yadav',
    phone: '+91-9415111001',
    aadhaar_masked: 'XXXX-XXXX-7777',
    municipality_id: '11111111-1111-1111-1111-111111111111'
  });

  console.log('\n===========================================================');
  console.log('🎉 Setup Complete!');
  console.log('   Master Admin Credentials:');
  console.log('   - Email:    masteradmin@fixitnow.gov');
  console.log('   - Password: FixItNow@2026!');
  console.log('\n   Staff Login Page: http://localhost:5174/ (One shared login)');
  console.log('===========================================================\n');
}

main().catch(console.error);

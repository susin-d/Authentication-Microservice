/**
 * Make User Admin Script
 * Promotes a user to admin role by email
 * 
 * Usage: node scripts/make-admin.js <email>
 * Example: node scripts/make-admin.js admin@example.com
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Check required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL is not set in .env file');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY is not set in .env file');
  console.log('💡 Add this to your .env file:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here');
  console.log('\n📍 Find it in: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function makeAdmin(email) {
  if (!email) {
    console.error('❌ Error: Email is required');
    console.log('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
  }

  console.log(`🔍 Looking for user: ${email}`);

  // Find user by email
  const { data: user, error: findError } = await supabase
    .from('users')
    .select('id, email, role, account_status')
    .eq('email', email)
    .single();

  if (findError || !user) {
    console.error(`❌ User not found: ${email}`);
    console.error(findError?.message);
    process.exit(1);
  }

  console.log(`✅ User found: ${user.email}`);
  console.log(`   Current role: ${user.role || 'user'}`);
  console.log(`   Account status: ${user.account_status}`);

  if (user.role === 'admin') {
    console.log('ℹ️  User is already an admin');
    process.exit(0);
  }

  // Update user role to admin
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Failed to update user role:', updateError.message);
    process.exit(1);
  }

  console.log('✅ User successfully promoted to admin!');
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: admin`);
  console.log('\n🎉 Done! User can now access admin-only endpoints.');
}

// Get email from command line arguments
const email = process.argv[2];
makeAdmin(email);

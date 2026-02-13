/**
 * Delete User from Supabase Auth
 * Use this to remove users from the authentication system
 */

const supabaseAdmin = require('../src/config/supabase');

async function deleteAuthUser(email) {
  try {
    console.log(`🔍 Looking for user: ${email}`);
    
    // Get user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`⚠️  User ${email} not found in Supabase Auth`);
      return;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    
    // Delete user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error('❌ Error deleting user:', deleteError.message);
      return;
    }
    
    console.log(`🗑️  Deleted user ${email} from Supabase Auth`);
    console.log(`✅ User can now sign up again`);
    
    // Note: Profile will be auto-deleted by CASCADE constraint
    console.log(`ℹ️  Profile record will be auto-deleted by database CASCADE`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Usage: node scripts/delete-auth-user.js
const emailToDelete = process.argv[2] || 'susindransd@gmail.com';

console.log('🚀 Supabase Auth User Deletion Tool\n');
deleteAuthUser(emailToDelete).then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});

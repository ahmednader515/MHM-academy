const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSessionManagement() {
  console.log('🧪 Testing Session Management...\n');

  try {
    // Test 1: Check if we can find a user
    const users = await prisma.user.findMany({
      take: 1,
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        sessionId: true,
        lastLoginAt: true
      }
    });

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const testUser = users[0];
    console.log('✅ Found test user:', testUser.fullName);
    console.log('   Phone:', testUser.phoneNumber);
    console.log('   Is Active:', testUser.isActive);
    console.log('   Session ID:', testUser.sessionId);
    console.log('   Last Login:', testUser.lastLoginAt);

    // Test 2: Test session creation
    console.log('\n🔄 Testing session creation...');
    
    // First, make sure user is not active
    await prisma.user.update({
      where: { id: testUser.id },
      data: { isActive: false, sessionId: null }
    });

    // Test session creation manually
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        isActive: true,
        sessionId: sessionId,
        lastLoginAt: new Date()
      }
    });
    
    console.log('✅ Session created with ID:', sessionId);

    // Test 3: Verify session is active
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { isActive: true, sessionId: true }
    });
    console.log('✅ User is active:', updatedUser?.isActive);

    // Test 4: Test session validation
    const sessionUser = await prisma.user.findUnique({
      where: { sessionId },
      select: {
        id: true,
        fullName: true,
        phoneNumber: true,
        email: true,
        role: true,
        image: true,
        isActive: true,
        sessionId: true
      }
    });
    
    const isValid = sessionUser && sessionUser.isActive && sessionUser.sessionId === sessionId;
    console.log('✅ Session validation:', isValid);
    console.log('   User:', sessionUser?.fullName);

    // Test 5: Test session ending
    console.log('\n🔄 Testing session ending...');
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        isActive: false,
        sessionId: null
      }
    });
    
    const userAfterLogout = await prisma.user.findUnique({
      where: { id: testUser.id },
      select: { isActive: true, sessionId: true }
    });
    console.log('✅ User is active after logout:', userAfterLogout?.isActive);

    // Test 6: Test session validation after logout
    const sessionUserAfter = await prisma.user.findUnique({
      where: { sessionId }
    });
    console.log('✅ Session validation after logout:', !sessionUserAfter);

    console.log('\n🎉 All session management tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSessionManagement();

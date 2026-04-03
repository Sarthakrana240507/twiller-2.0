const API_URL = 'http://localhost:5000';
const TEST_EMAIL = 'subscription_test@example.com';

async function runTest() {
    console.log('--- Starting Verification Test for Subscription Feature ---');

    try {
        // 1. Create a test user
        console.log('\n1. Creating test user (Free Plan)...');
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: TEST_EMAIL,
                username: 'subtester',
                displayName: 'Sub Tester',
                avatar: 'https://via.placeholder.com/150'
            })
        });
        const user = await regRes.json();
        const userId = user._id;
        console.log(`User created. Current Plan: ${user.subscriptionPlan || 'Free'}`);

        // 2. Test Tweet Limit for Free Plan (Limit: 1)
        console.log('\n2. Testing Tweet Limit for Free Plan...');
        const tweet1 = await fetch(`${API_URL}/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: userId, content: 'First tweet' })
        });
        console.log('Tweet 1 status:', tweet1.status); // 201

        const tweet2 = await fetch(`${API_URL}/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author: userId, content: 'Second tweet' })
        });
        const data2 = await tweet2.json();
        console.log('Tweet 2 status:', tweet2.status); // 403
        console.log('Error message:', data2.error);

        // 3. Test Time Restriction for Order Creation
        console.log('\n3. Testing Time Restriction for Payments (10-11 AM IST)...');
        const orderRes = await fetch(`${API_URL}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'Bronze', email: TEST_EMAIL })
        });

        // Check if it's currently between 10-11 AM IST
        const now = new Date();
        const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (5.5 * 60 * 60 * 1000));
        const hours = istTime.getHours();

        if (hours < 10 || hours >= 11) {
            if (orderRes.status === 403) {
                console.log('✅ Correctly blocked outside window: ', (await orderRes.json()).error);
            } else {
                console.error('❌ Error: Payment allowed outside window! Status:', orderRes.status);
            }
        } else {
            if (orderRes.status === 200) {
                console.log('✅ Correctly allowed during window.');
            } else {
                console.error('❌ Error: Payment blocked during window! Status:', orderRes.status);
            }
        }

        console.log('\n--- Subscription Verification Complete ---');

    } catch (error) {
        console.error('\nVerification failed:', error.message);
    }
}

runTest();

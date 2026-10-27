import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('https://engine.hyperbeam.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk_live_rexAShD5AwWh9CtlNlC9ws2psK1ZdDHqPsjJW__Wyho',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start_url: 'https://duckduckgo.com'
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response text:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();

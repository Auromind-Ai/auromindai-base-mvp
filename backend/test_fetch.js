const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch("http://localhost:8000/admin/impersonate/123e4567-e89b-12d3-a456-426614174000", {
      method: "POST",
      headers: { "Authorization": "Bearer fake_token" }
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}
test();

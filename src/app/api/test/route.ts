export async function GET() {
  return new Response(JSON.stringify({ message: "API test endpoint working" }), {
    headers: { "Content-Type": "application/json" },
  });
}
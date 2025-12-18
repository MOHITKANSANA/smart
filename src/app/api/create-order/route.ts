// This file is no longer needed as the order creation is now handled on the client-side.
// You can safely delete this file.
export async function POST() {
    return new Response(JSON.stringify({ error: "This endpoint is deprecated." }), {
        status: 404,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

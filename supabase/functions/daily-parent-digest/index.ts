// Retired: student records are no longer shared through parent digests.
Deno.serve(() => new Response(JSON.stringify({error: "Parent digests have been retired"}), {
  status: 410, headers: {"Content-Type": "application/json"}
}));

// lib/sendToModel.ts
export async function sendToModel(data: {
  user1_id: string;
  user2_id: string;
  debateId: string;
  query1: string;
  query2: string;
}) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  return result;
}

import { NextResponse } from "next/server";

export async function POST(req:any) {
  try {
    const body = await req.json(); 
    console.log("Received test judge request:", body);

    // Send the same data to the Hugging Face Space endpoint
    const hfResponse = await fetch("https://suday95-debate-aico.hf.space/aijudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // same as curl’s --max-time 300 (set timeout manually in JS)
    });

    if (!hfResponse.ok) {
      throw new Error(`HuggingFace request failed: ${hfResponse.statusText}`);
    }

    const data = await hfResponse.json();

    return NextResponse.json(data);

  } catch (err:any) {
    console.error("AI Judge route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

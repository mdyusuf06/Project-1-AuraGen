// ============================================================
// GEMINI CONNECTION TEST
// Run before anything else to confirm your API key works.
// Usage: node test-gemini.js
// ============================================================

import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",   // Use flash for quick test (cheaper)
    temperature: 0.2,
    googleApiKey: process.env.GEMINI_API_KEY,
});

console.log("🧪 Testing Gemini connection...\n");

try {
    const response = await llm.invoke([
        new HumanMessage(
            'Reply with ONLY this JSON, nothing else: {"status": "working", "model": "gemini-1.5-flash"}'
        ),
    ]);

    console.log("✅ Gemini is connected and working!");
    console.log("Response:", response.content);
    console.log("\n🚀 You can now run: npm run dev");
} catch (error) {
    console.error("❌ Connection FAILED:", error.message);
    console.error("\nCheck:");
    console.error("  1. GEMINI_API_KEY is set correctly in .env");
    console.error("  2. Your API key starts with 'AIzaSy...'");
    console.error("  3. You have internet connection");
    console.error("  4. npm install has been run");
}
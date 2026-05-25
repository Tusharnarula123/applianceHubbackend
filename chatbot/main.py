from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from typing import List, Optional
import os, json, httpx, numpy as np
from dotenv import load_dotenv
import pdfplumber

load_dotenv()

app = FastAPI(title="ScanaInfoTech Chatbot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")

# ── Bot Configuration ─────────────────────────────────────────────────────────
bot_config = {
    "name": "Scana Bot",
    "welcome_message": "Hi! I'm your appliance assistant. Ask me about any appliance by name, model number, or SKU.",
    "color": "#16a34a",
    "category": "General",
    "logo_letter": "S",
}

# ── RAG System (PDF → Embeddings → Retrieval) ────────────────────────────────
rag_chunks: List[dict] = []   # [{text, embedding, source}]

def chunk_text(text: str, size: int = 500, overlap: int = 80) -> List[str]:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start : start + size])
        start += size - overlap
    return [c for c in chunks if c.strip()]

def get_embedding(text: str) -> list:
    res = client.embeddings.create(input=text[:2000], model="text-embedding-3-small")
    return res.data[0].embedding

def cosine_sim(a: list, b: list) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

def retrieve_context_local(query: str, top_k: int = 3) -> str:
    if not rag_chunks:
        return ""
    q_emb = get_embedding(query)
    ranked = sorted(rag_chunks, key=lambda c: cosine_sim(q_emb, c["embedding"]), reverse=True)
    return "\n\n".join(f"[{c['source']}]: {c['text']}" for c in ranked[:top_k])


async def retrieve_context_backend(query: str, appliance_id: str) -> str:
    """Use Nest API embeddings (document_chunks) — same data as dashboard uploads."""
    try:
        async with httpx.AsyncClient(timeout=30) as http:
            r = await http.post(
                f"{BACKEND_URL}/api/chat/ai/{appliance_id}/retrieve-context",
                json={"query": query},
            )
            if r.status_code == 200:
                data = r.json()
                return data.get("context") or ""
    except Exception:
        pass
    return ""

# ── OpenAI Function-Calling Tools ────────────────────────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_appliance_by_sku",
            "description": "Fetch full appliance details using its unique SKU number",
            "parameters": {
                "type": "object",
                "properties": {"sku": {"type": "string", "description": "Appliance SKU"}},
                "required": ["sku"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_appliance_by_model",
            "description": "Fetch appliance details using its model number",
            "parameters": {
                "type": "object",
                "properties": {"model_number": {"type": "string", "description": "Model number"}},
                "required": ["model_number"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_appliances",
            "description": "Search appliances by name, brand, or type (e.g. 'Samsung washing machine')",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_appliance_documents",
            "description": "Get warranty, manual, or support documents for an appliance by its ID",
            "parameters": {
                "type": "object",
                "properties": {"appliance_id": {"type": "string"}},
                "required": ["appliance_id"],
            },
        },
    },
]

async def call_backend(path: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=8) as http:
            r = await http.get(f"{BACKEND_URL}{path}")
            return r.json()
    except Exception as e:
        return {"error": str(e)}

async def execute_tool(name: str, args: dict) -> str:
    if name == "get_appliance_by_sku":
        data = await call_backend(f"/appliances?sku={args['sku']}")
    elif name == "get_appliance_by_model":
        data = await call_backend(f"/appliances?model={args['model_number']}")
    elif name == "search_appliances":
        data = await call_backend(f"/appliances?search={args['query']}")
    elif name == "get_appliance_documents":
        data = await call_backend(f"/appliances/{args['appliance_id']}/documents")
    else:
        data = {"error": f"Unknown tool: {name}"}
    return json.dumps(data)

# ── Chat Endpoint ─────────────────────────────────────────────────────────────
conversation_history: List[dict] = []

class ChatRequest(BaseModel):
    message: str
    appliance_id: Optional[str] = None

@app.post("/chat")
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conversation_history.append({"role": "user", "content": request.message})

    context = ""
    if request.appliance_id:
        context = await retrieve_context_backend(request.message, request.appliance_id)
    if not context:
        context = retrieve_context_local(request.message)
    system_prompt = (
        f"You are {bot_config['name']}, an AI assistant for ScanaInfoTech — "
        f"an AI-powered appliance intelligence platform. "
        f"Category focus: {bot_config['category']}. "
        f"You can look up appliances by SKU, model number, or name using the available tools. "
        f"Always be concise and helpful.\n\n"
        + (f"Relevant document knowledge:\n{context}" if context else "")
    )

    messages = [{"role": "system", "content": system_prompt}, *conversation_history]

    try:
        MAX_ROUNDS = 5
        for _ in range(MAX_ROUNDS):
            response = client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            )
            choice = response.choices[0]

            if choice.finish_reason != "tool_calls":
                break

            # Append assistant message with tool calls
            tc_msg = choice.message
            messages.append({
                "role": "assistant",
                "content": tc_msg.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in tc_msg.tool_calls
                ],
            })

            # Execute each tool and append result
            for tc in tc_msg.tool_calls:
                result = await execute_tool(tc.function.name, json.loads(tc.function.arguments))
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

        reply = response.choices[0].message.content or "I couldn't process that request."
        conversation_history.append({"role": "assistant", "content": reply})
        return {"reply": reply}

    except Exception as e:
        conversation_history.pop()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chat/reset")
async def reset():
    conversation_history.clear()
    return {"message": "Conversation cleared"}

# ── Config Endpoints ──────────────────────────────────────────────────────────
class BotConfigUpdate(BaseModel):
    name: Optional[str] = None
    welcome_message: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    logo_letter: Optional[str] = None

@app.get("/config")
async def get_config():
    return bot_config

@app.put("/config")
async def update_config(update: BotConfigUpdate):
    for field, value in update.model_dump(exclude_none=True).items():
        bot_config[field] = value
    return bot_config

# ── PDF Upload → RAG ──────────────────────────────────────────────────────────
os.makedirs("uploads", exist_ok=True)

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    path = f"uploads/{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())

    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    chunks = chunk_text(text)
    added = 0
    for chunk in chunks:
        rag_chunks.append({"text": chunk, "embedding": get_embedding(chunk), "source": file.filename})
        added += 1

    return {"message": f"Indexed {added} chunks from {file.filename}", "total_chunks": len(rag_chunks)}

@app.get("/documents")
async def list_documents():
    sources = list({c["source"] for c in rag_chunks})
    return {"documents": sources, "total_chunks": len(rag_chunks)}

@app.get("/health")
async def health():
    return {"status": "ok", "rag_chunks": len(rag_chunks)}

# ── Serve Frontend ────────────────────────────────────────────────────────────
app.mount("/", StaticFiles(directory="static", html=True), name="static")

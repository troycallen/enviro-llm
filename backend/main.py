from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psutil
import uvicorn
from datetime import datetime

app = FastAPI(title="EnviroLLM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://envirollm.com", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "EnviroLLM API is running"}

@app.get("/metrics")
async def get_metrics():
    return {
        "timestamp": datetime.now().isoformat(),
        "cpu_usage": psutil.cpu_percent(interval=1),
        "memory_usage": psutil.virtual_memory().percent,
        "power_estimate": 50 + (psutil.cpu_percent() * 0.5) 
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
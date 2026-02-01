from fastapi import FastAPI
from dotenv import load_dotenv
import os

# 환경 변수 로드
load_dotenv()

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from Peekle AI Server"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

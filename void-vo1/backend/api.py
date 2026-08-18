from fastapi import FastAPI,WebSocket
from fastapi.middleware.cors import CORSMiddleware
from telemetry.manager import telemetry_snapshot,stream
from tts.routes import router as tts_router
app=FastAPI(title='VOID VO-1 API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
app.include_router(tts_router,prefix='/api/tts')
@app.get('/api/health')
async def health():return {'ok':True,'service':'void-vo1','telemetry':'active'}
@app.get('/api/telemetry')
async def telemetry():return telemetry_snapshot()
@app.websocket('/ws/telemetry')
async def telemetry_ws(ws:WebSocket):await ws.accept();await stream(ws)
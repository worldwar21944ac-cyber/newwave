from fastapi import APIRouter
from pydantic import BaseModel
router=APIRouter()
class TTSRequest(BaseModel):text:str;rate:float=1.0;voice:str='default'
@router.get('/voices')
async def voices():return {'voices':['default','system']}
@router.post('/speak')
async def speak(req:TTSRequest):return {'ok':True,'text':req.text,'rate':req.rate,'voice':req.voice,'mode':'browser-speech-synthesis'}
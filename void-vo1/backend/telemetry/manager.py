import asyncio,math,time

def telemetry_snapshot():
 t=time.time();return {'timestamp':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(t)),'system':'VO-1','status':'ONLINE','metrics':{'cpu':round(30+18*abs(math.sin(t/7)),1),'memory':round(55+10*abs(math.sin(t/13)),1),'power':round(820+45*math.sin(t/11)),'temperature':round(24+2*math.sin(t/17),1),'signal':round(96+3*math.sin(t/5),1)},'nodes':{'active':19,'total':19}}
async def stream(ws):
 while True:
  try:await ws.send_json(telemetry_snapshot());await asyncio.sleep(1)
  except Exception:break
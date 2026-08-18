from workers import WorkerEntrypoint
import asgi
from api import app
class Default(WorkerEntrypoint):
 async def fetch(self,request):return await asgi.fetch(app,request,self.env)
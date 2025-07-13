interface Env {
	R2_BUCKET: R2Bucket
	R2_PUBLIC_DOMAIN: string
  }
export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	  if (req.method === 'OPTIONS') {
		return new Response(null, {
		  status: 204,
		  headers: corsHeaders,
		})
	  }
  
	  if (req.method === 'POST' && new URL(req.url).pathname === '/upload') {
		const formData = await req.formData()
		const file = formData.get('file') as File
		if (!file) return new Response('No file', { status: 400, headers: corsHeaders })
  
		const arrayBuffer = await file.arrayBuffer()
		const key = `${Date.now()}-${file.name}`
		const bucket = env.R2_BUCKET
  
		await bucket.put(key, arrayBuffer, {
		  httpMetadata: { contentType: file.type },
		})
  
		const publicUrl = `https://pub-${env.R2_PUBLIC_DOMAIN}/${key}`
  
		return new Response(JSON.stringify({ url: publicUrl }), {
		  headers: {
			...corsHeaders,
			'Content-Type': 'application/json',
		  },
		})
	  }
  
	  return new Response('Not found', { status: 404, headers: corsHeaders })
	},
  } satisfies ExportedHandler<Env>
  
  const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
  }
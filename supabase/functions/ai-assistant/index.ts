import { withSupabase } from 'npm:@supabase/server'

type AiOperation = 'create' | 'polish' | 'shorten' | 'expand' | 'instruction' | 'questions' | 'quiz'

const corsError = (message: string, status = 400) => Response.json({ error: message }, { status })

const operationGuidance: Record<AiOperation, string> = {
  create: 'Buat teks baru dari topik atau arahan pengguna. Jika konteksnya materi, buat struktur yang mudah dipelajari.',
  polish: 'Perbaiki ejaan, tata bahasa, alur, dan kejelasan tanpa mengubah maksud atau menambahkan fakta yang tidak diberikan.',
  shorten: 'Ringkas teks menjadi versi yang padat. Pertahankan poin, istilah teknis, angka, dan instruksi penting.',
  expand: 'Kembangkan teks dengan penjelasan, contoh, atau langkah yang relevan. Jangan mengarang data spesifik yang tidak tersedia.',
  instruction: 'Ubah teks menjadi instruksi praktik yang jelas: tujuan singkat, persiapan bila perlu, langkah bernomor, dan hasil yang diharapkan.',
  questions: 'Buat pertanyaan evaluasi dari teks. Sertakan 5 pertanyaan yang beragam dan kunci jawaban singkat jika materi memungkinkannya.',
  quiz: 'Buat quiz pilihan ganda dari materi. Kembalikan JSON valid dengan description dan questions. Setiap soal wajib memiliki 4 opsi, correctIndex dari 0 sampai 3, dan explanation singkat.',
}

const isAiOperation = (value: unknown): value is AiOperation => (
  ['create', 'polish', 'shorten', 'expand', 'instruction', 'questions', 'quiz'].includes(String(value))
)

const cleanText = (value: unknown, maxLength: number): string => (
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
)

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method !== 'POST') return corsError('Metode request tidak didukung.', 405)

    const { data: userResult, error: userError } = await ctx.supabase.auth.getUser()
    if (userError || !userResult.user) return corsError('Sesi instruktur tidak valid.', 401)
    if (!userResult.user.email?.toLowerCase().endsWith('@politekniksorowako.ac.id')) {
      return corsError('Asisten AI hanya tersedia untuk akun instruktur institusi.', 403)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return corsError('Isi request tidak valid.')
    }

    const operation = body.operation
    const text = cleanText(body.text || body.material, operation === 'quiz' ? 20000 : 12000)
    const instruction = cleanText(body.instruction, 1200)
    const context = cleanText(body.context, 1500)
    const questionCount = Math.min(10, Math.max(3, Number(body.questionCount) || 5))
    const difficulty = cleanText(body.difficulty, 30) || 'menengah'

    if (!isAiOperation(operation)) return corsError('Jenis bantuan AI tidak valid.')
    if (operation !== 'create' && !text) return corsError('Teks sumber wajib diisi.')
    if (operation === 'create' && !text && !instruction) return corsError('Topik atau arahan pembuatan teks wajib diisi.')

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) return corsError('OPENROUTER_API_KEY belum disetel pada Supabase Edge Function.', 503)

    const source = text || '(belum ada teks sumber)'
    const quizFormat = operation === 'quiz'
      ? `\n\nAturan output quiz: Buat tepat ${questionCount} soal dengan tingkat kesulitan ${difficulty}. Kembalikan HANYA JSON valid tanpa markdown fence dengan bentuk: {"description":"...","questions":[{"prompt":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"..."}]}. correctIndex harus menunjuk jawaban yang benar. Distraktor harus masuk akal dan tidak ambigu.`
      : ''
    const prompt = [
      `Tugas: ${operationGuidance[operation]}`,
      context ? `Konteks aplikasi: ${context}` : '',
      instruction ? `Arahan tambahan pengguna: ${instruction}` : '',
      'Teks sumber:',
      source,
      '',
      'Kembalikan hanya hasil teks yang siap ditempel ke editor. Jangan beri pembuka seperti “Berikut hasilnya”, jangan gunakan markdown fence, dan jangan menyebut proses internal.',
      quizFormat,
    ].filter(Boolean).join('\n\n')

    const model = Deno.env.get('OPENROUTER_MODEL') || 'openai/gpt-4o-mini'
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('OPENROUTER_SITE_URL') || 'https://portal-praktik-poliwako.vercel.app',
        'X-Title': Deno.env.get('OPENROUTER_APP_NAME') || 'Portal Praktik Poliwako',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Anda adalah asisten editor akademik berbahasa Indonesia untuk instruktur pendidikan vokasi. Utamakan ketepatan, kejelasan, dan gaya yang dapat langsung digunakan. Jika diminta JSON, patuhi format JSON secara ketat.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2200,
        temperature: 0.3,
      }),
    })

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text()
      console.error('OpenRouter request failed', aiResponse.status, errorBody.slice(0, 500))
      return corsError('Layanan OpenRouter sedang tidak tersedia. Periksa model atau API key di Supabase.', 502)
    }

    const payload = await aiResponse.json()
    const outputText = typeof payload.choices?.[0]?.message?.content === 'string'
      ? payload.choices[0].message.content.trim()
      : ''

    if (!outputText) return corsError('AI tidak menghasilkan teks. Silakan coba dengan arahan lain.', 502)
    if (operation === 'quiz') {
      try {
        const jsonText = outputText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
        const parsed = JSON.parse(jsonText)
        const questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, questionCount).map((question: any) => ({
          prompt: String(question.prompt || '').trim(),
          options: Array.isArray(question.options) ? question.options.slice(0, 4).map((option: any) => String(option || '').trim()) : [],
          correctIndex: Math.min(3, Math.max(0, Number(question.correctIndex) || 0)),
          explanation: String(question.explanation || '').trim(),
        })).filter((question: any) => question.prompt && question.options.length === 4 && question.options.every((option: string) => option)) : []
        if (questions.length < 3) return corsError('AI belum menghasilkan minimal 3 soal yang valid. Coba lagi dengan materi yang lebih jelas.', 502)
        return Response.json({ quiz: { description: String(parsed.description || 'Jawab pertanyaan berikut berdasarkan materi yang telah dipelajari.'), questions }, model: payload.model || model })
      } catch {
        return corsError('Format quiz dari AI tidak valid. Silakan coba lagi.', 502)
      }
    }
    return Response.json({ text: outputText, model: payload.model || model })
  }),
}

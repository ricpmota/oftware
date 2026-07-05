import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'capture-print.js');
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], { windowsHide: true });
    const filePath = (stdout || '').trim() || path.join(process.env.TMPDIR || '/tmp', 'print.jpg');
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'attachment; filename="print.jpg"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar screenshot via Node script:', error);
    return NextResponse.json(
      { error: 'Nao foi possivel capturar screenshot.' },
      { status: 500 }
    );
  }
}

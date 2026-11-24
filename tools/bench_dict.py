#!/usr/bin/env python3
"""Dictionary benchmark on a real book: how many words of the text get a CC-CEDICT entry, a Wiktionary entry, or only a
reconstruction from their characters, plus cross-references and character readings. Runs the app's own code in headless Chrome.
    python3 tools/bench_dict.py book.txt   (plain text, one paragraph per line; traditional or simplified)
The book is copied to bench/ (git-ignored) and served with the app on localhost."""
import asyncio, json, os, shutil, subprocess, sys, time
from playwright.async_api import async_playwright
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(root, 'bench'), exist_ok=True)
shutil.copy(sys.argv[1], os.path.join(root, 'bench', 'book.txt'))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'))
        pg = await b.new_page()
        await pg.goto('http://127.0.0.1:8765/index.html'); await pg.wait_for_timeout(1500)
        await pg.evaluate('Promise.all([Dict.load(), Words.load()])')
        r = await pg.evaluate(open(os.path.join(root, 'tools', 'bench_dict.js'), encoding='utf8').read())
        print(json.dumps(r, ensure_ascii=False, indent=1)); await b.close()
try: asyncio.run(main())
finally: srv.terminate()

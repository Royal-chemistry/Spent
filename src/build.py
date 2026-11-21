"""Joins the source parts into the two pages that ship:

  spent.html  the page as published on claude.ai (a fragment: the host adds the document shell)
  index.html  the same app as a complete document, for GitHub Pages or any static host
"""
import pathlib

src = pathlib.Path(__file__).resolve().parent
root = src.parent
read = lambda p: (src / p).read_text()

css = read('css/base.css') + read('css/v2.css') + read('css/v3.css')
js = ''.join(read(f'js/{f.name}') for f in sorted((src / 'js').glob('*.js')))
style = '<style>\n' + css + '</style>\n'
themes = '<script>\n' + read('themes.js') + '</script>\n'
import os
test_hook = '  window.__spentTest = { parseQuick, guessCategory, findInsights, healthScore, forecastMonth, budgetStatus };\n' if os.environ.get('SPENT_TEST') else ''
app = read('body.html') + '\n<script>\n(() => {\n  "use strict";\n\n' + js + test_hook + '})();\n</script>\n'

fragment = read('head.html') + style + themes + app

# The small reset the claude.ai shell provides, so the standalone page behaves the same.
RESET = (
    '<style>\n'
    ':root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }\n'
    'body { margin: 0; font: 14px system-ui, sans-serif; }\n'
    'img { max-width: 100%; }\n'
    '[hidden] { display: none !important; }\n'
    '</style>\n'
)
ICON = ("<link rel=\"icon\" href=\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
        "%3Crect width='64' height='64' rx='14' fill='%2309090B'/%3E"
        "%3Cpath d='M43 22c-2-4-6-6-11-6-6 0-11 3-11 8 0 12 23 5 23 17 0 5-5 8-12 8-6 0-10-3-12-7' fill='none' stroke='%23E11D2E' stroke-width='7' stroke-linecap='round'/%3E"
        "%3C/svg%3E\">\n")
PWA = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#09090B">\n'
       '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n')
document = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + read('head.html') + ICON + PWA + RESET + style + themes
    + '</head>\n<body>\n' + app + '</body>\n</html>\n'
)

for name, page in (('spent.html', fragment), ('index.html', document)):
    (root / name).write_text(page)
    print(f'{name} {len(page):,} bytes')

# Offline support for the standalone site: a service worker whose cache name changes with every build, and the manifest
import hashlib, json
version = hashlib.sha1(document.encode()).hexdigest()[:10]
(root / 'sw.js').write_text(read('sw.js').replace('__HASH__', version))
manifest = {
    'name': 'Spent', 'short_name': 'Spent', 'description': 'A free, private money tracker that runs in your browser.',
    'start_url': './', 'scope': './', 'display': 'standalone', 'background_color': '#09090B', 'theme_color': '#09090B',
    'icons': [
        {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'icons/maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
    ],
}
(root / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'sw.js version {version}, manifest.webmanifest')

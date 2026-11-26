#!/usr/bin/env python3
"""Build author preview from approved 7.6; never modify production inputs."""
from pathlib import Path
import hashlib, shutil, zipfile, sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "preview-7.6"
DEST = Path(sys.argv[1]) if len(sys.argv)>1 else ROOT / "_author-review"
DEST.mkdir(parents=True, exist_ok=True)
archive = ROOT / "author-portraits-7.7.zip"
expected = {
    "author-main.webp": "716f0829172af9f53f77f0dfc42040880f7c955c0d083a19307b1c33cf6dbb59",
    "author-chair.webp": "46cc0e088609b2af4dda032de76540157f1e5e6b228f892656793fa8b34bce08",
    "author-method.webp": "269e513a5989d77c8c4c26d2d254fa38bf75b151dfc2614a17320704933aa3c8",
    "author-standing.webp": "37ee730622887fb61bb8b2530a93e4a945cc225310946df2ccb4554e9b7b2e21",
}
assert hashlib.sha256(archive.read_bytes()).hexdigest()=="e4252f50604cbd2263d7ec1d26d72384dc996959754019dff4ae5456c6a4a9f2", "Unapproved portrait archive"
with zipfile.ZipFile(archive) as z:
    assert len(z.namelist()) == 4 and set(z.namelist()) == set(expected)
    for name, digest in expected.items():
        data=z.read(name)
        assert data[:4]==b"RIFF" and data[8:12]==b"WEBP"
        assert hashlib.sha256(data).hexdigest()==digest
        (DEST/name).write_bytes(data)
for name in ["gentleman-hero.webp","chapter-01-desire.webp","chapter-02-search.webp","chapter-03-fitting.webp"]:
    shutil.copyfile(SOURCE/name,DEST/name)
html=(SOURCE/"index.html").read_text(encoding="utf-8")
original=html
changes=[]
def insert(anchor, addition, before=True):
    global html
    assert html.count(anchor)==1, anchor
    value=addition+anchor if before else anchor+addition
    html=html.replace(anchor,value,1)
    changes.append((value,anchor))
css="""<style id="author-77-style">
.author77{background:#211516;color:#f8efe5;padding:clamp(32px,5vw,70px) 0}
.author77 .author77-grid{display:grid;grid-template-columns:minmax(0, .85fr) minmax(0,1.15fr);gap:clamp(20px,4vw,52px);align-items:center}
.author77 h2,.author77 h3{color:#fff3e7;margin:0 0 14px}
.author77 h2{font-size:clamp(30px,4vw,52px);line-height:1.12}
.author77 p{color:#e6d5c5;line-height:1.65;max-width:60ch}
.author77 .author77-kicker{color:#edc68d;font-size:12px;letter-spacing:.13em;text-transform:uppercase;margin-bottom:12px}
.author77 figure{margin:0;min-width:0}
.author77 img{display:block;width:100%;height:auto;border-radius:4px;border:1px solid #705044;box-sizing:border-box}
.author77 figcaption{font-size:13px;line-height:1.5;color:#d9c4b4;margin-top:8px}
.author77 .author77-note{font-size:14px;color:#d9c4b4}
.author77 .author77-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;max-width:800px;margin:24px auto 0;align-items:start}
.author77 .author77-pair img{aspect-ratio:4/5;object-fit:contain;background:#211516}
.author77-method{margin:32px 0;border-radius:6px;padding:clamp(16px,3vw,32px)}
.author77-method .author77-grid{grid-template-columns:minmax(0,.55fr) minmax(0,1.45fr)}
.author77-link{display:inline-block;color:inherit;text-decoration:underline;text-underline-offset:4px;min-height:44px;padding:10px 0;box-sizing:border-box}
.author77-link:focus-visible{outline:3px solid currentColor;outline-offset:4px}
@media(max-width:700px){.author77 .author77-grid,.author77-method .author77-grid{grid-template-columns:1fr}.author77 .author77-grid figure{max-width:380px;margin:0 auto;width:100%}.author77 .author77-pair{gap:10px}.author77 .author77-pair figcaption{font-size:12px}}
</style>"""
insert("</head>",css)
insert('<div class="hero-proof-count">','<a class="author77-link" href="#audit-author">Познакомиться с автором аудита</a>')
insert('<section id="emotional-audit" aria-labelledby="ea-title">',"""<section class="author77" id="audit-author" aria-labelledby="author77-title"><div class="wrap author77-grid"><figure><img src="author-main.webp" width="1050" height="1149" loading="lazy" decoding="async" alt="Стилизованный портрет автора в бордовом костюме в кресле"/><figcaption>AI-портрет автора · художественный образ</figcaption></figure><div><div class="author77-kicker">Об авторе / Независимый взгляд</div><h2 id="author77-title">Алексей.<br/>QA-инженер · BitOS</h2><p>Я исследую цифровой путь клиента: от первого знакомства с брендом до обращения и повторного заказа. Моя задача — увидеть, где интерфейс помогает человеку принять решение, а где создаёт лишние препятствия.</p><p>В этом аудите я отделяю воспроизводимые результаты тестов от гипотез о продажах и предлагаю проверяемые улучшения.</p><p class="author77-note">Независимый аудит. Портреты созданы с помощью ИИ на основе фотографии автора; они не изображают реальные визиты в Atelier 23 и не являются доказательствами проверок.</p></div></div></section>""")
insert('<h3 class="faq-title">',"""<div class="author77 author77-method" id="author-method"><div class="author77-grid"><figure><img src="author-method.webp" width="833" height="1250" loading="lazy" decoding="async" alt="Стилизованный портрет автора в тёмном костюме"/><figcaption>AI-портрет автора</figcaption></figure><div><div class="author77-kicker">Мой подход</div><h3>Сначала проверка. Затем гипотеза.</h3><p>Фиксирую условия и результат, собираю доказательства, проверяю воспроизводимость. Коммерческий эффект оценивается только после согласования исходных метрик и проверки гипотезы.</p></div></div></div>""")
insert('</main>','''<section class="author77" id="author-gallery" aria-labelledby="author77-gallery-title"><div class="wrap"><div class="author77-kicker">BitOS / Автор аудита</div><h2 id="author77-gallery-title">Продолжим диалог.</h2><p>Предлагаю начать с одной задачи, важной именно для вашего бизнеса.</p><div class="author77-pair"><figure><img src="author-chair.webp" width="1050" height="1149" loading="lazy" decoding="async" alt="Стилизованный портрет автора в кожаном кресле"/><figcaption>AI-портрет · концепт</figcaption></figure><figure><img src="author-standing.webp" width="1000" height="1250" loading="lazy" decoding="async" alt="Стилизованный портрет автора в бордовом костюме стоя"/><figcaption>AI-портрет · концепт</figcaption></figure></div></div></section>''')
restored=html
for added,anchor in reversed(changes):
    restored=restored.replace(added,anchor,1)
assert restored==original, "Unexpected modifications to 7.6"
(DEST/"index.html").write_text(html,encoding="utf-8")
print("Approved 7.6 restored byte-for-byte at text level; four portraits verified.")

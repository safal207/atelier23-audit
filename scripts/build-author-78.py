#!/usr/bin/env python3
"""Build 7.8 from byte-pinned 7.7, with authentic portrait and reduced decorative imagery."""
from pathlib import Path
import hashlib, re, shutil, subprocess, sys, tempfile
ROOT=Path(__file__).resolve().parents[1]
DEST=Path(sys.argv[1]).resolve()
photo=ROOT/"author-real.webp"
assert hashlib.sha256(photo.read_bytes()).hexdigest()=="2218990af31fe301940702986393d28e37686f731035b44ee1ae31830c845728", "Original portrait hash mismatch"
with tempfile.TemporaryDirectory() as temp:
    old=Path(temp)/"baseline"
    subprocess.run([sys.executable,str(ROOT/"scripts/build-author-77.py"),str(old)],check=True)
    DEST.mkdir(parents=True,exist_ok=True)
    h=(old/"index.html").read_text()
    original=h
    def replace(a,b):
        global h
        assert h.count(a)==1,a[:100]
        h=h.replace(a,b,1)
    def sub(pattern,replacement,n):
        global h
        h,count=re.subn(pattern,replacement,h,flags=re.S)
        assert count==n,(pattern,count)
    replace('<figure><img src="author-main.webp" width="1050" height="1149" loading="lazy" decoding="async" alt="Стилизованный портрет автора в бордовом костюме в кресле"/><figcaption>AI-портрет автора · художественный образ</figcaption></figure>',
        '<figure><img src="author-real.webp" width="720" height="960" loading="lazy" decoding="async" alt="Настоящая фотография Алексея, автора аудита"/><figcaption>Алексей · личная фотография, без генеративной обработки</figcaption></figure>')
    replace('Независимый аудит. Портреты созданы с помощью ИИ на основе фотографии автора; они не изображают реальные визиты в Atelier 23 и не являются доказательствами проверок.',
        'Независимый аудит. Здесь — моя настоящая фотография. Художественные AI-образы отдельно обозначены и не являются доказательствами посещения Atelier 23.')
    sub(r'<div class="ea-visual"><img src="chapter-0[123]-[^"]+\.webp"[^>]*/></div>', '',3)
    replace('За каждым образом — результат проверки','За каждой главой — результат проверки')
    replace('Три художественные AI-иллюстрации — концепция клиентского пути, не фотографии реального клиента или ателье. Исходные доказательства сохранены.',
        'Три главы — сценарии клиентского пути, а не измеренная воронка продаж. Исходные доказательства сохранены.')
    sub(r'<figure><img src="author-method\.webp"[^>]*>.*?</figure>','',1)
    sub(r'<section class="author77" id="author-gallery".*?</section>', '',1)
    replace('<h2>Выберем один приоритет.</h2>', '<h2>15 минут, чтобы выбрать следующий шаг.</h2>')
    replace('Андрей, предлагаю 15-минутный разговор, чтобы понять, какая задача сейчас действительно важна. Определим исходные показатели, границы пилота и критерий приёмки. Без обязательств, оплаты или обещаний роста.',
        'Андрей, предлагаю коротко разобрать одну задачу вашего бизнеса. За 15 минут выберем, что проверять первым: поиск товаров, запись на примерку или другой приоритет. Согласуем измеримый критерий результата и поймём, есть ли смысл в пилоте. Без обязательств и обещаний роста.')
    replace('Подготовить сообщение для созвона','Скопировать сообщение для 15-минутного созвона')
    replace('Когда удобно созвониться? Согласуем исходный показатель и критерий результата.','Когда удобно созвониться? Выберем первую проверяемую гипотезу и критерий результата.')
    replace('</head>', '''<style id="author-78-style">
.author77-method .author77-grid{grid-template-columns:minmax(0,1fr)}
.author77 #author77-title{line-height:1.15}
#emotional-audit .ea-card .ea-copy{padding-top:24px}
#growth-copy{white-space:normal;max-width:100%;min-height:48px}
@media(max-width:700px){#growth-copy{width:100%}.author77 #author77-title{font-size:32px}}
</style></head>''')
    # One authentic portrait plus one decorative hero. Keep original embedded proof images and every proof link.
    assert len(re.findall(r'<img[^>]+src="(?:author-|chapter-|gentleman-)',original))==8
    assert len(re.findall(r'<img[^>]+src="(?:author-|chapter-|gentleman-)',h))==2
    def section(s,id):
        return re.search(r'<section[^>]*id="'+id+r'"[^>]*>.*?</section>',s,re.S)[0]
    for id in ['guided-audit','photo-album','client-path','evidence','search','speed','social','journey','plan','test-cases']:
        assert section(original,id)==section(h,id),id
    def proof_data(s):
        return re.findall(r'data:image/[^"\s]+',s)
    assert proof_data(original)==proof_data(h)
    assert re.findall(r'href="https://[^"]+"',original)==re.findall(r'href="https://[^"]+"',h)
    for name in ['gentleman-hero.webp']:
        shutil.copyfile(old/name,DEST/name)
    shutil.copyfile(photo,DEST/photo.name)
    (DEST/"index.html").write_text(h,encoding="utf-8")
    print("PASS: original evidence, ten sections, external links unchanged; decorative/portrait images 8 -> 2")

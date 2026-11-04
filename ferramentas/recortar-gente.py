"""Recorta as figuras de gente do fundo verde, na altura cheia (Rodada 47, conversa pela câmera).

Uso: python ferramentas/recortar-gente.py [pasta de saída]
Lê os originais de 688 x 1024 em ../gerencia/higgsfield/elenco/ e ../gerencia/higgsfield/gente/, só para os
nomes que já existem em img/gente/, e grava <nome>.webp (até 150 KB) e <nome>.png (360 px, o de antes,
para quem não lê webp) na pasta de saída (padrão: img/gente/).

O recorte: a "verdura" de cada pixel (G menos o maior entre R e B) vira transparência numa rampa suave;
na borda, o verde que sobra é tirado (despill: G não passa do maior entre R e B). Depois, um corte justo
em volta do que ficou opaco.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
ORIGENS = [RAIZ.parent / 'gerencia' / 'higgsfield' / 'elenco', RAIZ.parent / 'gerencia' / 'higgsfield' / 'gente']
SAIDA = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'img' / 'gente'
LIMITE_KB = 150


def recortar(caminho: Path, caixa=None) -> Image.Image:
    rgb = np.asarray(Image.open(caminho).convert('RGB')).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    verde = g - np.maximum(r, b)
    # Rampa: até 18 é pessoa (opaco); a partir de 60 é fundo (transparente).
    alfa = np.clip(1 - (verde - 18) / 42, 0, 1)
    # Despill só na borda (até 3 px da transparência): lá o verde do fundo vaza; dentro, a cor fica a original.
    borda = np.asarray(Image.fromarray((alfa * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(7))) < 250
    g2 = np.where(borda & (verde > 0), np.maximum(r, b), g)
    saida = np.dstack([r, g2, b, alfa * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(saida, 'RGBA')
    caixa = caixa or Image.fromarray((alfa > 0.5).astype(np.uint8) * 255).getbbox()
    return im.crop(caixa)


def gravar_webp(im: Image.Image, destino: Path):
    for q in (88, 84, 80, 76, 72, 68, 64, 60):
        im.save(destino, 'WEBP', quality=q, alpha_quality=90, method=6)
        if destino.stat().st_size <= LIMITE_KB * 1024:
            return q
    return q


def avulsa(origem: Path, nome: str, trocas=()):
    """Uma figura nova: recorta origem e grava img/gente/<nome>.webp e .png. trocas: [(x0, y0, x1, y1)] de
    pixels verdes na pessoa (uma pulseira verde) que viram laranja antes do recorte, para não abrir buraco."""
    im = Image.open(origem).convert('RGB')
    if trocas:
        a = np.asarray(im).astype(np.int16).copy()
        for x0, y0, x1, y1 in trocas:
            q = a[y0:y1, x0:x1]
            verde = (q[..., 1] - np.maximum(q[..., 0], q[..., 2])) > 18
            # Laranja com o mesmo brilho: troca R e G e baixa o azul.
            r, g, b = q[..., 0].copy(), q[..., 1].copy(), q[..., 2].copy()
            q[..., 0] = np.where(verde, g, r)
            q[..., 1] = np.where(verde, (g * 0.55).astype(np.int16), g)
            q[..., 2] = np.where(verde, (b * 0.4).astype(np.int16), b)
        im = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    tmp = SAIDA / f'_{nome}.png'
    im.save(tmp)
    fig = recortar(tmp)
    tmp.unlink()
    q = gravar_webp(fig, SAIDA / f'{nome}.webp')
    fig.resize((max(1, round(fig.width * 360 / fig.height)), 360), Image.LANCZOS).save(SAIDA / f'{nome}.png', optimize=True)
    print(f'{nome}: {fig.width}x{fig.height}, webp q{q}, {(SAIDA / f"{nome}.webp").stat().st_size // 1024} KB')


def segundo_quadro(base: Path, quadro2: Path, nome: str):
    """O quadro 2 de uma figura animada (o sambista batendo no pandeiro): reduzido ao tamanho do original e
    recortado com a MESMA caixa do quadro 1, para a troca seca não mexer o corpo. Grava <nome>.webp."""
    rgb = np.asarray(Image.open(base).convert('RGB')).astype(np.float32)
    verde = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    caixa = Image.fromarray((np.clip(1 - (verde - 18) / 42, 0, 1) > 0.5).astype(np.uint8) * 255).getbbox()
    tmp = SAIDA / f'_{nome}.png'
    Image.open(quadro2).convert('RGB').resize(Image.open(base).size, Image.LANCZOS).save(tmp)
    fig = recortar(tmp, caixa)
    tmp.unlink()
    q = gravar_webp(fig, SAIDA / f'{nome}.webp')
    fig.resize((max(1, round(fig.width * 360 / fig.height)), 360), Image.LANCZOS).save(SAIDA / f'{nome}.png', optimize=True)
    print(f'{nome}: {fig.width}x{fig.height}, webp q{q}, {(SAIDA / f"{nome}.webp").stat().st_size // 1024} KB')


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    nomes = sorted(p.stem for p in (RAIZ / 'img' / 'gente').glob('*.webp'))
    for nome in nomes:
        orig = next((o / f'{nome}.png' for o in ORIGENS if (o / f'{nome}.png').exists()), None)
        if not orig:
            print(f'SEM ORIGINAL: {nome}')
            continue
        im = recortar(orig)
        q = gravar_webp(im, SAIDA / f'{nome}.webp')
        pequeno = im.resize((max(1, round(im.width * 360 / im.height)), 360), Image.LANCZOS)
        pequeno.save(SAIDA / f'{nome}.png', optimize=True)
        print(f'{nome}: {im.width}x{im.height}, webp q{q}, {(SAIDA / f"{nome}.webp").stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()

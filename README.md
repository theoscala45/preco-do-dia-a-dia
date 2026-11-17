# O Preço do Dia a Dia

Quanto custa a mesma compra em cada bairro de São Paulo, e quanto ela subiu contra o IPCA.

Projeto em construção. **Os preços que o site mostra hoje são de exemplo (inventados).** O coletor de preços reais ainda não existe.

## O que tem aqui

| Pasta ou arquivo | O que é |
|---|---|
| `index.html`, `assets/` | O site. Página inicial com o mapa 3D, a história guiada pelo scroll e o comparador de lista. |
| `DESIGN.md` | Direção visual: cores, tipografia, regras de movimento. |
| `data/` | As tabelas do projeto (ver `data/LEIAME.md`). `data/exemplo/` tem os preços inventados. |
| `tools/` | Scripts que geram as tabelas, o mapa e o arquivo de dados do site. |
| `docs/briefing-site.md` | O que o site precisa ser. |

## Ver o site no computador

```
python3 -m http.server 8000
```

Depois abra http://localhost:8000. Abrir o `index.html` direto com dois cliques não funciona, porque o navegador bloqueia a leitura dos dados.

## Refazer os dados do site

```
python3 tools/gerar_exemplo.py        # recria data/exemplo/ (preços inventados)
python3 tools/montar_site.py exemplo  # recria assets/dados.json a partir de data/exemplo/
python3 tools/montar_site.py real     # quando o coletor estiver preenchendo data/precos.csv
```

O mapa arredondado sai de `python3 tools/arredondar_mapa.py` (precisa de `pip install shapely`). Rode depois de `tools/preparar_mapa.py`.

Com `real`, a faixa "Dados de exemplo" some do site sozinha.

## Fontes e licenças

- Contorno dos distritos: Prefeitura de São Paulo (GeoSampa), via `codigourbano/distritos-sp`.
- three.js (MIT), Fredoka e Nunito (SIL Open Font License). As licenças estão em `assets/vendor` e `assets/fonts`.

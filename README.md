# O Preço do Dia a Dia

Quanto custa a mesma compra em cada bairro de São Paulo, e quanto ela subiu contra o IPCA.

Projeto em construção. **Os preços que o site mostra hoje são de exemplo (inventados).** O coletor de preços reais roda toda noite pelo GitHub Actions (02h17, com reserva às 05h17) e grava em `data/precos/`. Ele lê sete redes: Tenda, Atacadão, Carrefour, Pão de Açúcar, Sonda, Santa Luzia e Hirota. O site passa para os preços reais quando houver dados suficientes.

## O que tem aqui

| Pasta ou arquivo | O que é |
|---|---|
| `index.html`, `lista.html`, `inflacao.html`, `metodo.html`, `assets/` | O site: início com o mapa real, resultado da lista, inflação do bairro, método e fontes. |
| `.claude/skills/` | Skills de animação (GSAP e Lenis) usadas ao escrever o site. Não fazem parte do site. |
| `DESIGN.md` | Direção visual: cores, tipografia, regras de movimento. |
| `data/` | As tabelas do projeto (ver `data/LEIAME.md`). `data/exemplo/` tem os preços inventados. |
| `tools/` | Scripts que geram as tabelas, o mapa e o arquivo de dados do site. |
| `coletor/` | O coletor de preços (`coletar.py`), a junção das partes da noite (`juntar.py`), o aviso de falha (`alerta.py`) e a revisão semanal dos links (`revisar_links.py`, que abre a issue "Links para revisar" às segundas). |
| `.github/workflows/` | A coleta noturna, a revisão semanal dos links e o agente de casamento de produtos. |
| `agente/` | Agente que acha a página de cada produto no site de uma rede nova (ainda sem chave da API). |
| `docs/emails-para-as-redes.md` | Rascunhos dos e-mails às redes. |
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
python3 tools/montar_site.py real     # quando o coletor tiver preenchido data/precos/
python3 tools/baixar_ibge.py          # atualiza data/ipca.csv e data/pesos_ipca.csv (IBGE, SIDRA)
```

O mapa arredondado sai de `python3 tools/arredondar_mapa.py` (precisa de `pip install shapely`). Rode depois de `tools/preparar_mapa.py`.

Lojas, pontos e rotas do mapa real (precisa de internet, um pedido por segundo):

```
python3 tools/buscar_lojas_e_rotas.py lojas    # data/lojas.csv
python3 tools/buscar_lojas_e_rotas.py pontos   # data/pontos_geo.csv
python3 tools/buscar_lojas_e_rotas.py rotas    # assets/rotas.json
python3 tools/preparar_geo.py                  # assets/geo.json
```

Com `real`, a faixa "Dados de exemplo" some do site sozinha.

## Fontes e licenças

- Contorno dos distritos: Prefeitura de São Paulo (GeoSampa), via `codigourbano/distritos-sp`.
- Mapa, lojas e ruas: © colaboradores do OpenStreetMap (licença ODbL). Busca pelo Nominatim, rotas pelo OSRM.
- Imagem do mapa: blocos do OpenFreeMap, carregados dos servidores deles quando a página abre. O estilo `assets/mapa-estilo.json` é uma adaptação do estilo Dark do OpenFreeMap.
- MapLibre GL JS (BSD de 3 cláusulas), Lenis (MIT) e família Red Hat (SIL Open Font License). As licenças estão em `assets/vendor` e `assets/fonts`.
- GSAP, ScrollTrigger e SplitText: licença padrão "no charge" da GreenSock (https://gsap.com/standard-license).

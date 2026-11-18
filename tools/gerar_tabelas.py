# ATENCAO: este foi o script que criou as tabelas no comeco do projeto. Ele reescreve produtos, ceps, redes, links,
# ipca e pesos do zero. Nao rode de novo sem ler: links.csv e as tabelas do IBGE ja foram editadas depois.
import csv, os
D = "/home/claude/tenda/data"
B = "https://www.tendaatacado.com.br/produto/"

def w(name, header, rows):
    with open(os.path.join(D, name), "w", newline="", encoding="utf-8") as f:
        cw = csv.writer(f); cw.writerow(header); cw.writerows(rows)

# ---- produtos (aba Cesta) ----
prod_txt = """Alimentos básicos|Arroz branco tipo 1|Camil|5 kg|Pacote
Alimentos básicos|Arroz branco tipo 1|Tio João|5 kg|Pacote
Alimentos básicos|Feijão carioca tipo 1|Camil|1 kg|Pacote
Alimentos básicos|Feijão preto tipo 1|Camil|1 kg|Pacote
Alimentos básicos|Óleo de soja|Soya|900 ml|Garrafa
Alimentos básicos|Azeite extravirgem|Gallo|500 ml|Garrafa
Alimentos básicos|Açúcar refinado|União|1 kg|Pacote
Alimentos básicos|Açúcar cristal|União|1 kg|Pacote
Alimentos básicos|Café torrado e moído extraforte|Pilão|500 g|Pacote
Alimentos básicos|Café torrado e moído tradicional|3 Corações|500 g|Pacote
Alimentos básicos|Farinha de trigo tradicional|Dona Benta|1 kg|Pacote
Alimentos básicos|Farinha de mandioca|Yoki|500 g|Pacote
Alimentos básicos|Macarrão espaguete com ovos|Renata|500 g|Pacote
Alimentos básicos|Macarrão parafuso|Barilla|500 g|Pacote
Alimentos básicos|Molho de tomate tradicional|Pomarola|300 g|Sachê
Alimentos básicos|Extrato de tomate|Elefante|300 g|Lata
Alimentos básicos|Sal refinado|Cisne|1 kg|Pacote
Alimentos básicos|Fubá mimoso|Yoki|500 g|Pacote
Alimentos básicos|Aveia em flocos|Quaker|450 g|Lata
Alimentos básicos|Achocolatado em pó|Nescau|350 g|Lata
Alimentos básicos|Biscoito cream cracker|Vitarella|350 g|Pacote
Alimentos básicos|Biscoito recheado chocolate|Passatempo|130 g|Pacote
Alimentos básicos|Pão de forma tradicional|Pullman|480 g|Pacote
Alimentos básicos|Margarina com sal|Qualy|500 g|Pote
Alimentos básicos|Maionese tradicional|Hellmann's|500 g|Pote
Alimentos básicos|Ketchup tradicional|Heinz|397 g|Frasco
Alimentos básicos|Sardinha em óleo|Gomes da Costa|125 g|Lata
Alimentos básicos|Atum ralado em óleo|Gomes da Costa|170 g|Lata
Alimentos básicos|Milho verde em conserva|Quero|170 g|Lata
Alimentos básicos|Ervilha em conserva|Quero|170 g|Lata
Alimentos básicos|Vinagre de álcool|Castelo|750 ml|Garrafa
Alimentos básicos|Tempero para frango|Sazón|60 g|Caixa
Alimentos básicos|Caldo de galinha|Knorr|57 g|Caixa
Alimentos básicos|Leite condensado|Moça|395 g|Lata
Alimentos básicos|Creme de leite|Nestlé|200 g|Caixinha
Alimentos básicos|Mistura para bolo|Dona Benta|450 g|Pacote
Alimentos básicos|Água mineral sem gás|Crystal|1,5 L|Garrafa
Alimentos básicos|Refrigerante|Coca-Cola|2 L|Garrafa
Laticínios e ovos|Leite integral UHT|Italac|1 L|Caixa
Laticínios e ovos|Leite integral UHT|Piracanjuba|1 L|Caixa
Laticínios e ovos|Leite desnatado UHT|Piracanjuba|1 L|Caixa
Laticínios e ovos|Leite em pó integral|Ninho|380 g|Lata
Laticínios e ovos|Manteiga com sal|Aviação|200 g|Pote
Laticínios e ovos|Queijo muçarela fatiado|Tirolez|150 g|Bandeja
Laticínios e ovos|Queijo prato fatiado|Tirolez|150 g|Bandeja
Laticínios e ovos|Requeijão cremoso|Vigor|200 g|Copo
Laticínios e ovos|Iogurte natural integral|Nestlé|170 g|Copo
Laticínios e ovos|Iogurte de morango|Batavo|1,15 kg|Garrafa
Laticínios e ovos|Presunto cozido fatiado|Sadia|200 g|Bandeja
Laticínios e ovos|Queijo minas frescal|Tirolez|500 g|Peça
Laticínios e ovos|Ovos brancos grandes|Marca da loja|20 unidades|Bandeja
Laticínios e ovos|Ovos vermelhos grandes|Marca da loja|20 unidades|Bandeja
Higiene e limpeza|Papel higiênico folha dupla|Neve|12 rolos|Pacote
Higiene e limpeza|Papel higiênico folha dupla|Personal|12 rolos|Pacote
Higiene e limpeza|Sabonete em barra|Dove|90 g|Unidade
Higiene e limpeza|Sabonete em barra|Lux|85 g|Unidade
Higiene e limpeza|Creme dental Total 12|Colgate|90 g|Unidade
Higiene e limpeza|Creme dental Máxima Proteção|Colgate|90 g|Unidade
Higiene e limpeza|Escova de dente|Colgate|1 unidade|Unidade
Higiene e limpeza|Shampoo|Seda|325 ml|Frasco
Higiene e limpeza|Condicionador|Seda|325 ml|Frasco
Higiene e limpeza|Desodorante aerosol|Rexona|150 ml|Frasco
Higiene e limpeza|Fio dental|Oral-B|50 m|Unidade
Higiene e limpeza|Absorvente com abas|Always|8 unidades|Pacote
Higiene e limpeza|Fralda descartável tamanho M|Huggies|Pacote|Pacote
Higiene e limpeza|Sabão em pó|Omo|1,6 kg|Caixa
Higiene e limpeza|Sabão líquido|Omo|3 L|Galão
Higiene e limpeza|Amaciante concentrado|Comfort|500 ml|Frasco
Higiene e limpeza|Detergente líquido neutro|Ypê|500 ml|Frasco
Higiene e limpeza|Água sanitária|Super Candida|2 L|Frasco
Higiene e limpeza|Desinfetante|Pinho Sol|500 ml|Frasco
Higiene e limpeza|Limpador multiuso|Veja|500 ml|Frasco
Higiene e limpeza|Esponja dupla face|Scotch-Brite|3 unidades|Pacote
Higiene e limpeza|Saco de lixo 50 L|Dover Roll|Rolo|Rolo
Higiene e limpeza|Papel toalha|Snob|2 rolos|Pacote
Higiene e limpeza|Sabão em barra|Ypê|5 unidades|Pacote
Higiene e limpeza|Álcool líquido 46º|Coperalcool|1 L|Frasco
Higiene e limpeza|Inseticida aerosol|SBP|360 ml|Frasco
Carnes e hortifruti|Peito de frango|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Coxa e sobrecoxa de frango|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Frango inteiro congelado|Sadia|1 kg|Preço por kg
Carnes e hortifruti|Carne moída (patinho)|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Acém|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Contrafilé|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Linguiça toscana|Seara|1 kg|Preço por kg
Carnes e hortifruti|Salsicha|Perdigão|500 g|Pacote
Carnes e hortifruti|Filé de tilápia congelado|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Banana prata|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Maçã gala|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Laranja pera|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Limão taiti|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Tomate|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Cebola|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Alho|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Batata|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Cenoura|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Alface crespa|Sem marca|1 unidade|Unidade
Carnes e hortifruti|Mamão formosa|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Abobrinha|Sem marca|1 kg|Preço por kg
Carnes e hortifruti|Pimentão verde|Sem marca|1 kg|Preço por kg"""
prods = [l.split("|") for l in prod_txt.split("\n")]
assert len(prods) == 100, len(prods)
rows = []
for i, p in enumerate(prods, 1):
    indice = "nao" if p[0] == "Carnes e hortifruti" else "sim"
    rows.append([f"P{i:03d}", *p, indice])
w("produtos.csv", ["produto_id","categoria","produto","marca","tamanho","compara_por","entra_no_indice"], rows)

# ---- ceps (aba CEPs) ----
ceps_txt = """Centro|Bela Vista|01310-100|Avenida Paulista|Central
Centro|República|01045-000|Praça da República|Central
Centro|Bom Retiro|01124-000|Rua Afonso Pena|Central
Centro|Liberdade|01503-001|Avenida da Liberdade|Central
Centro|Brás|03003-000|Rua da Figueira|Central
Oeste|Pinheiros|05422-000|Rua dos Pinheiros|Central
Oeste|Lapa|05074-000|Rua Dronsfield|Intermediário
Oeste|Butantã|05503-001|Avenida Vital Brasil|Intermediário
Oeste|Rio Pequeno|05379-000|Avenida do Rio Pequeno|Intermediário
Oeste|Jardim Íris (Pirituba)|05144-000|Rua Eugênio Lorenzetti|Periferia
Sul|Planalto Paulista (Moema)|04077-000|Alameda dos Tupiniquins|Central
Sul|Santo Amaro|04711-000|Rua Engenheiro Mesquita Sampaio|Intermediário
Sul|Capão Redondo|05860-000|Rua Almirante Luís Penido Burnier|Periferia
Sul|Grajaú (Parque América)|04822-000|Rua Jequirituba|Periferia
Sul|Jardim Ângela (Alto da Riviera)|04929-000|Avenida Nova Arcádia|Periferia
Leste|Mooca|03104-000|Rua da Mooca|Intermediário
Leste|Tatuapé|03063-000|Avenida Celso Garcia|Intermediário
Leste|Itaquera|08210-000|Rua Campinas do Piauí|Periferia
Leste|Guaianases|08410-000|Rua Salvador Gianetti|Periferia
Leste|Sapopemba (Fazenda da Juta)|03977-000|Rua Tenente Godofredo Cerqueira Leite|Periferia
Norte|Santana|02012-000|Praça Campo de Bagatelle|Intermediário
Norte|Tucuruvi|02304-000|Avenida Tucuruvi|Intermediário
Norte|Vila Maria|02117-000|Rua Andaraí|Intermediário
Norte|Brasilândia|02845-000|Rua Joaquim Ferreira da Rocha|Periferia
Norte|Perus|05204-000|Avenida Doutor Sylvio de Campos|Periferia"""
cp = [l.split("|") for l in ceps_txt.split("\n")]
assert len(cp) == 25
w("ceps.csv", ["cep_id","zona","bairro","cep","rua","perfil"], [[f"C{i:02d}", *c] for i, c in enumerate(cp, 1)])

# ---- redes ----
redes = [
 ["tenda","Tenda Atacado","por_cep","liberado","https://www.tendaatacado.com.br"],
 ["carrefour","Carrefour","por_cep","liberado_com_duvida","https://mercado.carrefour.com.br"],
 ["atacadao","Atacadão","por_loja","liberado_com_cuidado","https://www.atacadao.com.br"],
 ["pao-de-acucar","Pão de Açúcar","unico","liberado_com_duvida","https://www.paodeacucar.com"],
 ["sonda","Sonda","unico","liberado",""],
 ["st-marche","St Marche","unico","autorizado","https://marche.com.br"],
 ["santa-luzia","Santa Luzia","unico","liberado_com_duvida",""],
 ["hirota","Hirota","por_loja","liberado_com_duvida","https://www.lojahirota.com.br"],
 ["nagumo","Nagumo","por_loja","liberado","https://www.nagumo.com.br"],
]
w("redes.csv", ["rede_id","nome","tipo_preco","situacao","site"], redes)

# ---- links (Tenda) ----
slug = {1:"arroz-branco-t1-camil-selecoes-5kg",3:"feijao-carioca-tipo-1-camil-1kg-481",4:"feijao-preto-camil-1kg-546",
6:"azeite-extra-virgem-gallo-500ml-317",7:"acucar-refinado-uniao-1kg-60",8:"acucar-cristal-uniao-1kg",
9:"cafe-torrado-e-moido-extraforte-pilao-pacote-500g",10:"cafe-em-po-3-coracoes-tradicional-500g",
11:"farinha-de-trigo-tradicional-dona-benta-1kg-156",12:"farinha-de-mandioca-tipo-1-fina-yoki-pacote-500g",
13:"macarrao-ovos-espaguete-9-renata-500g-12256",17:"sal-refinado-cisne-1kg-304",18:"fuba-de-milho-mimoso-yoki-pacote-1kg",
19:"aveia-em-flocos-finos-quaker-450g",20:"achocolatado-em-po-nescau-lata-350g",
21:"biscoito-cream-cracker-amanteigado-tradicional-vitarella-350g",
22:"biscoito-recheado-sabor-chocolate-passatempo-130g-15419",23:"pao-de-forma-pullman-480g-149",
24:"margarina-cremosa-com-sal-qualy-500g",26:"catchup-tradicional-heinz-397gr-3577",
28:"atum-ralado-em-oleo-gomes-da-costa-170g-523",29:"milho-verde-quero-170g-30981",30:"ervilha-quero-170g-30987",
31:"vinagre-de-alcool-castelo-750ml-4012",33:"caldo-knorr-de-galinha-57g-1561",34:"leite-condensado-moca-395g-3226",
35:"creme-de-leite-tradicional-nestle-200g-2762",37:"agua-mineral-sem-gas-crystal-1-5l-crystal-724",
38:"refrigerante-coca-cola-original-garrafa-2l",40:"leite-integral-piracanjuba-1l-27748",
42:"leite-em-po-ninho-integral-lata-380g",43:"manteiga-aviacao-pote-com-sal-200g-1030",
46:"requeijao-cremoso-vigor-200g-4689",49:"presunto-cozido-sadia-fat-180g",51:"ovos-grandes-branco-12-unidades-1395",
52:"ovos-grandes-vermelhos-12-unidades-1583",53:"papel-higienico-neve-toque-de-seda-folha-dupla-leve-12-pague-11-30m",
55:"sabonete-dove-cremoso-90g-283",56:"sabonete-em-barra-buque-de-jasmim-lux-85g-24436",
57:"creme-dental-colgate-total-original-mint-prevencao-ativa-90g",60:"shampoo-seda-sos-ceramidas-325ml-14777",
61:"condicionador-seda-sos-ceramidas-325ml-14749",62:"desodorante-aerossol-rexona-clinical-150ml",
64:"absorvente-com-abas-super-protecao-suave-always-8un-27782",65:"fralda-huggies-supreme-care-m-66un",
67:"detergente-liquido-omo-puro-cuidado-3l",68:"amaciante-concentrado-comfort-frescor-intenso-500ml",
69:"detergente-ype-neutro-500ml",71:"desinfetante-pinho-sol-perfumado-lavanda-promo-leve-500ml-pague-450ml",
72:"limpador-multiuso-veja-perfumado-jojo-marcante-e-envolvente-500ml",
78:"inseticida-aerossol-acao-magnetica-sbp-360ml",
79:"file-de-peito-de-frabgo-congelado-sadia-zip-pct1kg-3842",80:"sobrecoxa-seara-iqf-1kg",
83:"acem-bovino-resfriado-pedaco-1kg",84:"contra-file-bovino-bife-400g",85:"linguica-toscana-seara-600g",
87:"file-de-tilapia-congelado-600g-peixe-cancaon",89:"maca-gala-1kg-15833",90:"laranja-pera-a-granel-kg",
91:"limao-tahiti-500gr-15812",92:"tomate-salada-1kg-15830",93:"cebola-roxa-select-1kg",94:"alho-granel-100gr-15813",
95:"batata-lavada-extra-bandeja-1kg-15829",96:"cenoura-1kg-15831",97:"alface-crespa-unidade-911",
98:"mamao-formosa-kg",99:"abobrinha-italiana-kg",100:"pimentao-verde-440g-23323"}
conferir = {19,21,49,53,56,57,60,61,62,65,68,71,72,78,79,80,85,93,99}
rows = []
for n in range(1, 101):
    if n in slug:
        st = "conferir" if n in conferir else "achado"
        rows.append([f"P{n:03d}", "tenda", B + slug[n], st])
    else:
        st = "bloqueado_robots" if n == 73 else "nao_achado"
        rows.append([f"P{n:03d}", "tenda", "", st])
w("links.csv", ["produto_id","rede_id","url","status"], rows)
from collections import Counter
print(Counter(r[3] for r in rows))

# ---- tabelas que o coletor preenche ----
# precos (data/precos/AAAA-MM.csv) e execucoes.csv sao escritos pelo coletor (coletor/coletar.py). Este script nao mexe neles.
w("ipca.csv", ["mes","ipca_mensal_pct","ipca_alimentos_pct","ipca_higiene_pct","fonte"], [])
w("pesos_ipca.csv", ["produto_id","grupo_ipca","peso_pct","fonte"], [[f"P{i:03d}","","",""] for i in range(1,101)])
print("ok")

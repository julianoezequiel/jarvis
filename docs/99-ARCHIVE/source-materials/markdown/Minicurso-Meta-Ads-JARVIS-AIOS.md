J A R V I S · A I O S C O R E · M E T A A D S I N T E L L I G E N C E 

M I N I C U R S O P R Á T I C O · A N Á L I S E P O R C O N V E R S A 

# ANÁLISE DE 

# CAMPANHAS META 

# COM JARVIS 

P e r gu n t e . J a r v i s B u sc a . Vo c ê D ec i de . 

V O C Ê 

Jarvis , como está minha campanha de verão hoje ?

J A R V I S 

Buscando dados da Campanha Verão 2025 agora ...  ✓

conectado ao Meta Ads 

Hoje , até agora : 7 vendas · R$ 1.323 faturados · ROAS 4,1 x

CTR em 1,82% — acima da média . CPM subiu 12% comparado a ontem , mas o lucro está saudável . Quer que eu aprofunde algum ponto ?

V O C Ê 

Qual anúncio está vendendo mais ?

J A R V I S 

O vídeo  "Look completo – verão 25"  lidera com 5 das 7

vendas de hoje . ROAS isolado de  6,8 x. O carrossel de produtos está com 2 vendas mas CPA mais alto (R$ 61). 

Recomendo aumentar o orçamento do vídeo amanhã .

◈ Faça perguntas em português — JARVIS busca e interpreta os dados 

◈ Resultados em linguagem humana , não em tabelas de Excel 

◈ Diagnóstico , comparativos , alertas e relatórios por conversa 

◈ Dois modos : Diálogo instantâneo e Relatório estruturado ◈ S E T U P — A N T E S D E C O M E Ç A R 

# Integrando a  API da Meta  ao JARVIS 

Para o JARVIS buscar dados das suas campanhas em tempo real — como nas conversas deste minicurso — ele precisa de acesso autorizado à sua conta de anúncios . Isso é feito em  5 passos simples  via Meta for Developers , sem precisar saber programar .

Você vai criar uma "chave de acesso " que permite ao JARVIS ler os dados das suas campanhas — sem poder criar , editar ou pausar nada sem a sua ordem . Éleitura segura , não controle total .

01  Acesse o Meta for Developers 

Abra  developers .facebook .com  no navegador e faça login com a mesma conta do Facebook vinculada ao seu Gerenciador de Anúncios . Se ainda não tem um perfil de desenvolvedor , clique em  "Começar " — leva menos de 2 minutos .

02  Crie um App do tipo "Business" 

No painel do Developers , clique em  "Meus Apps " → "Criar App ". Quando perguntar o tipo , escolha  "Business ". Dê um nome como "JARVIS Analytics " e vincule à sua Conta de Negócios (Business Manager ).         

> Meus Apps →Criar App →Business →Nome: "JARVIS Analytics" →Criar

03  Gere o Access Token de Longa Duração 

Dentro do app criado , vá em  Ferramentas → Explorador da API do Graph . Selecione seu app , clique em  "Gerar Token de Acesso " e marque as permissões abaixo :      

> ✓ads_read ✓ads_management
> ✓read_insights ✓business_management

Depois de gerar , clique em  "Informações " e troque para um token de  longa duração (60 

dias ). Copie e guarde — você vai usar no próximo passo .

04  Encontre seu Ad Account ID 

No Gerenciador de Anúncios da Meta , olhe a URL do navegador . O número após 

act=  é o seu Ad Account ID .URL do Gerenciador:  

> facebook.com/adsmanager/manage/campaigns? act= 1234567890
> Seu Ad Account ID: act_1234567890

Guarde esse número junto com o token — o JARVIS vai precisar dos dois .

05  Configure no JARVIS e teste a conexão 

Cole as credenciais no JARVIS pela conversa abaixo . Ele vai testar a conexão automaticamente e confirmar quando estiver pronto :JARVIS · CONFIGURAÇÃO  SETUP META ADS      

> P R I M E I R A V E Z —S E T U P I N I C I A L
> JV JARVIS

Para conectar sua conta Meta Ads , preciso de dois dados que você acabou de gerar no Meta for Developers :

1. Seu  Access Token  (começa com "EAA ...") 

2. Seu  Ad Account ID  (formato : act _1234567890) 

Me passe os dois e eu configuro e testo a conexão agora .

⟳ validando credenciais com a API da Meta...    

> JV JARVIS
> ✓CONEXÃO ESTABELECIDA

Credenciais validadas com sucesso . Identifiquei sua conta :  

> ◈C O N T A C O N E C T A D A

Nome da conta  Vitá Store 

Ad Account ID  act_9876543210 

Campanhas ativas  4 campanhas 

Token válido até  60 dias (renovação automática) 

Nível de acesso  Leitura + Insights ✓

Estou pronto . Pode me perguntar sobre qualquer campanha agora . Quer oresumo de hoje ?

⟳ buscando dados em tempo real...  

> JV JARVIS

Jarvis , quero conectar minha conta do Meta Ads . Como faço ?

> V O C Ê

Token : EAABsbCS ... ( token completo ) — Ad Account ID :

act _9876543210 

> V O C Ê

Sim ! Como estão as campanhas hoje ?

> V O C Ê

Conta Vitá Store — resumo de hoje (até agora ):    

> ◈R E S U M O D O D I A

Total investido hoje  R$ 267,40 

Receita atribuída  R$ 1.122,00 

ROAS geral  4,2x ↑

Vendas realizadas  6 pedidos 

Campanha destaque  Carrinho Abandonado — ROAS 7,1x 

Tudo funcionando bem . Nenhum alerta ativo no momento .

◈ P R O B L E M A S C O M U N S N A C O N E X Ã O    

> E R R O C A U S A S O L U Ç Ã O
> Token inválido

Token copiado incompleto ou com espaço 

Gere um novo token no Explorador da API ecopie todo o texto (começa com "EAA ") 

> Sem permissão ads_read

Permissão não marcada na criação do token 

Volte ao Explorador da API , gere novo token emarque "ads _read " e "read _insights "

> Ad Account ID errado

ID sem o prefixo "act _"  Use sempre o formato completo :

act_1234567890  

> Token expirado

Token de curta duração venceu (1–2 h)

Diga "Jarvis , renova minha conexão Meta " — ele guia o processo de renovação 

◈ N Ã O Q U E R C O N F I G U R A R A A P I A G O R A ? 

Sem problema . Você pode começar imediatamente  copiando e colando os dados  do Gerenciador de Anúncios diretamente no chat . Exporte a tabela de campanhas (Gerenciador 

→ Exportar ), copie o conteúdo e diga : "Jarvis , analise esta tabela de campanhas : [ cole aqui ]" . A análise funciona da mesma forma — apenas sem atualização em tempo real .◈ F U N D A M E N T O S 

# Os dois modos:  Diálogo vs. Relatório 

O JARVIS trabalha com campanhas Meta de duas formas distintas . Entender quando usar cada uma é o que separa quem usa bem de quem usa mal :

◈ MODO DIÁLOGO 

Você pergunta , JARVIS responde na hora com os dados reais . Como ter um analista de plantão respondendo WhatsApp .

> USE: manhã, tarde, hora de pico, dúvidas pontuais

◈ MODO RELATÓRIO 

JARVIS compila , analisa e formata um documento completo com todos os dados do período , comparativos erecomendações .

> USE: fim de semana, reunião de cliente, revisão mensal

"Durante este minicurso , todas as conversas são  simulações reais  com a loja  Vitá Store  — moda feminina , R$ 8.000/ mês no Meta . Os dados são fictícios mas representam situações que acontecem todo dia em contas reais ." 

## Como Conectar JARVIS  ao Meta Ads 

Você tem três formas de dar acesso ao JARVIS para consultar suas campanhas :     

> M É T O D O C O M O F U N C I O N A N Í V E L D E A C E S S O

API Token 

(recomendado )

Gere um token de acesso no Meta for Developers e configure no JARVIS . Acesso direto e em tempo real .

Dados ao vivo ,

automação completa 

Copiar e Colar  Exporte a tabela do Gerenciador de Anúncios ,

copie e cole no chat . JARVIS lê e interpreta na hora .

Análise manual , sem automação 

Resposta em 5–10 segundos ▸

Linguagem natural , sem tabelas ▸

Ideal para decisões rápidas do dia adia 

▸

Pode fazer perguntas de acompanhamento 

▸

Documento estruturado e completo ▸

Ideal para reuniões e apresentações ▸

Pode ser enviado por e-mail automaticamente 

▸

Gerado semanal ou mensalmente ▸M É T O D O  C O M O F U N C I O N A  N Í V E L D E A C E S S O 

Print ou Screenshot 

Envie uma captura de tela do Gerenciador . JARVIS lê os números da imagem e analisa .

Consulta rápida einformal   

> ◈D I C A

Para começar hoje , use o método  Copiar e Colar . No Gerenciador de Anúncios ,

selecione o período , copie a tabela (Ctrl +A na tabela , Ctrl +C) e cole no chat . JARVIS vai ler einterpretar sem precisar de configuração .◈ M Ó D U L O 0 1 · D I Á L O G O 

## Perguntas Rápidas — O Dia a Dia 

As conversas mais comuns que você vai ter com JARVIS . Perguntas diretas , respostas com dados reais e contexto imediato para tomar decisões no momento certo .

◈ C E N A 1 — S e g u n d a - f e i r a , 1 4 h 1 2 JARVIS · META ADS  API CONECTADA · VITÁ STORE   

> 1 4 : 1 2 ·S E G U N D A - F E I R A

⟳ buscando dados em tempo real da Campanha Verão 2025...  

> JV JARVIS

Campanha  Verão 2025 — Prospecção , hoje até agora (00 h–14 h12):      

> ◈C A M P A N H A V E R Ã O 2 0 2 5 ·H O J E

Vendas realizadas  7 pedidos 

Faturamento  R$ 1.323,00 

Gasto até agora  R$ 322,40 

ROAS do dia  4,1x 

CTR  1,82% 

CPA médio  R$ 46,06 

Está performando bem — ROAS acima do seu alvo de 3,5 x. O CPM subiu 12% 

comparado a ontem (R$ 34 → R$ 38), provavelmente pelo horário , mas oretorno compensa . Quer que eu aprofunde algo ?

⟳ consultando breakdown por anúncio...  

> JV JARVIS

Das 7 vendas de hoje , a distribuição por anúncio é:     

> ◈V E N D A S P O R A N Ú N C I O ·H O J E

🎬 Vídeo "Look completo – verão 25"  5 vendas · ROAS 6,8x 

🛍  Carrossel "Looks para o trabalho " 2 vendas · ROAS 2,9x 

🖼  Imagem estática produto  0 vendas · ROAS 0x 

O vídeo está dominando — 71% das vendas com ROAS 6,8 x. O carrossel contribui mas com custo mais alto (CPA R$ 61 vs . R$ 34 do vídeo ). A imagem estática não converteu nada hoje . recomendo pausar hoje 

Jarvis , como está minha campanha de verão hoje ?

> V O C Ê

Qual anúncio está vendendo mais hoje ?

> V O C Ê

Aumenta o orçamento do vídeo então . Quanto você recomenda ? 

> V O C Ê JV JARVIS

O vídeo tem orçamento atual de  R$ 120/ dia  e já gerou R$ 816 em receita hoje 

(14 h) — ritmo para fechar o dia em ~R$ 1.400 com esse orçamento .

Recomendo aumentar para  R$ 200/ dia (+67%) . Motivos : ROAS 6,8 x ainda tem muito espaço , frequência do anúncio está em 2,1 x (longe da saturação ) e ohorário de pico ainda não chegou (17 h–20 h). 

Projeção com R$ 200/ dia : ~R$ 1.360 de receita extra por semana  assumindo ROAS conservador de 5,5 x.  

> ◈D I C A

Você não precisa saber calcular ROAS , CPA ou projeções . É só perguntar "vale apena aumentar ?" e JARVIS faz toda a matemática com base nos seus dados reais do dia .JARVIS · META ADS  VITÁ STORE · AO VIVO   

> 0 9 : 3 0 ·T E R Ç A - F E I R A

⟳ calculando CPA, margem e lucratividade real...  

> JV JARVIS

Vou colocar em contexto com os seus números de negócio (ticket médio R$ 189, margem 42%):     

> ◈A N Á L I S E D E L U C R A T I V I D A D E R E A L

Margem bruta por venda  R$ 79,38 

CPA desta semana  R$ 51,20 

Lucro líquido por venda (após ads ) R$ 28,18 

CPA máximo sustentável  R$ 65,00 

Situação  21% abaixo do limite   

> CPA SAUDÁVEL

— Você não está gastando demais . Com CPA de R$ 51 emargem de R$ 79, cada venda deixa R$ 28 no bolso depois dos anúncios . Asensação pode vir do volume menor de vendas ontem (5 vs . 7 do padrão ). Oproblema ontem foi o alcance baixo , não o custo por venda . 

> AN JARVIS via @analyst

Meu CPA está bom ? Tenho a sensação que estou gastando demais por venda .

> V O C Ê

E se eu quiser vender mais sem aumentar o CPA ? Como faço isso ?

> V O C Ê

Três caminhos que aumentam volume sem elevar CPA , em ordem de facilidade :

1. Expandir o público quente : sua campanha de remarketing (visitantes 30 

dias ) tem CPA de R$ 32 — muito abaixo do limite . Aumentar o orçamento dela de R$ 300 para R$ 600 traz mais vendas baratas sem tocar no CPA geral .

2. Ampliar janela de remarketing : de 30 dias para 60 dias você dobra opúblico elegível sem custo extra de prospecção . Essas pessoas já conhecem amarca — convertem mais barato .

3. Criar público Lookalike dos seus compradores dos últimos 90 dias : é abase mais quente possível para novo tráfego frio . Geralmente tem CPA 30– 40% menor que interesses genéricos .        

> ◈C E N A 3—Q u a r t a - f e i r a , 1 1 h 4 5 —A l e r t a r e c e b i d o

JARVIS · ALERTA AUTOMÁTICO  ⚠ ANOMALIA DETECTADA             

> 1 1 : 4 5 ·Q U A R T A —A L E R T A I N I C I A D O P E L O J A R V I S
> JV JARVIS ·ALERTA
> ⚠ANOMALIA DETECTADA

A campanha  Prospecção — Interesses Moda  atingiu frequência de  3,8 x esta manhã — acima do seu limite configurado de 3,0 x. Isso costuma indicar saturação de público e vai fazer o CTR cair nos próximos dias se não agir .

Resultado imediato já visível : CTR caiu de 1,14% ontem → 0,79% hoje . CPM subiu de R$ 31 → R$ 41. 

Recomendação imediata : pausar os 2 anúncios mais antigos desta campanha 

(estão rodando há 22 dias , geraram a saturação ) e lançar criativos novos .

Você quer que eu liste quais anúncios pausar ?

⟳ consultando histórico de criativos e datas de lançamento...  

> JV JARVIS

Anúncios para pausar agora :

Ao pausar esses dois , você libera ~R$ 80/ dia que estão sendo mal aproveitados . Quer que eu gere o briefing para os criativos substitutos ?

Sim , lista quais pausar .

> V O C Ê

Imagem "Coleção verão fundo branco " — 22 dias rodando · frequência 4,9 x ·

CTR 0,51% · R$ 1.240 gastos sem retorno proporcional 

✗

Imagem "50% OFF — banner vermelho " — 19 dias · frequência 4,2 x · CTR 

0,38% · está ativamente prejudicando o ROAS 

✗◈ M Ó D U L O 0 2 · D I A G N Ó S T I C O 

## Diagnóstico por Conversa 

Quando algo está errado mas você não sabe o quê — JARVIS investiga , cruza métricas eentrega o diagnóstico como um médico explicando um exame .

◈ C E N A 4 — S e x t a - f e i r a , 1 7 h — R O A S c a i u , n i n g u é m s a b e p o r q u ê JARVIS · META ADS  DIAGNÓSTICO   

> 1 7 : 0 0 ·S E X T A - F E I R A

⟳ analisando variações — cruzando métricas da semana vs. semana anterior...    

> AN JARVIS via @analyst ·INVESTIGANDO

Analisando todas as variáveis . Encontrei a causa — são duas mudanças simultâneas que explicam a queda :     

> ◈C A U S A D A Q U E D A D E R O A S

CPM esta semana  R$ 42 (+38% vs. semana passada) 

CVR do site (taxa de conversão ) 1,6% ( ↓ de 2,4%) 

CTR  1,21% (estável) 

Volume de cliques  estável 

Causa 1 — CPM mais caro (responsável por ~40% da queda ):  esta semana aconcorrência no leilão do Meta aumentou — provavelmente outros anunciantes do segmento de moda aceleraram campanhas de fim de mês . OCPM subiu mas você não mudou nada , então é mercado .

Causa 2 — Taxa de conversão do site caiu (responsável por ~60% da queda ): 

o anúncio está funcionando normalmente (CTR estável ), mas o site está convertendo menos . O problema não é no Meta — é na loja . Você mudou algo no checkout , frete ou estoque esta semana ? 

> JV JARVIS

Jarvis , meu ROAS caiu de 4,2 x para 2,8 x essa semana . O que aconteceu ? Não mudei nada .

> V O C Ê

Tivemos uma instabilidade no site na quarta . Ficou fora por umas 3

horas .

> V O C Ê

Confirmado — isso explica tudo . Na quarta , o Meta continuou gastando normalmente durante as 3h de instabilidade (os cliques chegaram , mas o site não carregou ). Esses cliques pagos não converteram nada , o que puxou a taxa de conversão da semana toda para baixo .

Estimativa do impacto da instabilidade :       

> ◈E S T I M A T I V A D E P E R D A —3 H D E I N S T A B I L I D A D E

Gasto durante a instabilidade  ~R$ 98 

Cliques que não converteram  ~43 cliques perdidos 

Vendas estimadas perdidas  ~2–3 pedidos 

Receita estimada perdida  ~R$ 378–567 

Boa notícia : o problema é pontual , não estrutural . Quando o site estabilizar , oROAS deve voltar ao normal . Para recuperar , ative o retargeting desses 43 

usuários que clicaram na quarta mas não compraram — eles são o público mais quente do momento .         

> ◈C E N A 5—S e g u n d a - f e i r a , 0 8 h —" Q u a l c a m p a n h a p a u s a r ? "

JARVIS · META ADS  ANÁLISE DE PORTFÓLIO   

> 0 8 : 1 5 ·S E G U N D A - F E I R A

⟳ analisando eficiência de todas as campanhas ativas...    

> AN JARVIS via @analyst ·OTIMIZAÇÃO DE PORTFÓLIO

Análise de eficiência das 4 campanhas ativas :      

> ◈R A N K I N G D E E F I C I Ê N C I A —C A M P A N H A S A T I V A S

🥇 Carrinho Abandonado  ROAS 7,2x · R$600/mês · manter 

🥈 Remarketing 30 dias  ROAS 5,8x · R$1.200/mês · manter 

🥉 Prospecção Interesses  ROAS 2,4x · R$3.800/mês · reduzir 

❌ Lookalike 1% Compradores  ROAS 1,3x · R$2.400/mês · pausar 

Recomendação clara : pause a campanha Lookalike 1% — ela tem ROAS 1,3 x,

o que significa que cada real gasto retorna apenas R$ 1,30 em receita . Após custos de produto , você está perdendo dinheiro nessa campanha .

Pausar o Lookalike  economiza exatamente R$ 2.400/ mês  — mais do que você precisa — sem perder nenhuma venda lucrativa , já que essa campanha não está gerando lucro de qualquer forma . 

> PM JARVIS via @pm

Dos R$ 2.400 liberados , você precisa cortar R$ 2.000 — sobram R$ 400 para realocar . Melhor destino :

→ Adicionar R$ 400 ao Carrinho Abandonado (de R$ 600 para R$ 1.000). 

Motivo : é sua campanha mais eficiente (ROAS 7,2 x). Cada R$ 100 extra investido nela retorna ~R$ 720 em receita . Com mais R$ 400/ mês , projeção de 

+R$ 1.152 de receita adicional  no mês , sem aumentar o orçamento total .

Jarvis , tenho 4 campanhas ativas . O budget está apertado esse mês — preciso cortar R$ 2.000 sem perder vendas . Qual campanha pausar ?

> V O C Ê

E os R$ 400 que sobram do corte , onde reinvisto ?    

> V O C Ê ◈M Ó D U L O 0 3 ·C O M P A R A T I V O S

## Comparativos e Histórico por Conversa 

JARVIS acessa o histórico completo das campanhas e responde comparações de qualquer período — semana a semana , mês a mês , antes e depois de mudanças .

◈ C E N A 6 — D o m i n g o , 1 8 h — F e c h a m e n t o s e m a n a l JARVIS · META ADS  RESUMO SEMANAL   

> 1 8 : 0 0 ·D O M I N G O

⟳ consolidando dados semanais e calculando variações...     

> JV JARVIS ·RESUMO SEMANA 23 vs. 22
> SEMANA PASSADA

## R$ 12.480 

32 vendas · ROAS 3,1 x 

> ESTA SEMANA

## R$ 16.947 

41 vendas · ROAS 4,2 x ↑

Semana com crescimento de 35,8% na receita  e 28,1% mais vendas com omesmo orçamento (R$ 4.000). ROAS subiu de 3,1 x para 4,2 x.

O que explicou a melhora :

⟳ verificando histórico de 30 dias dia a dia...  

> JV JARVIS

Nos últimos 30 dias , o ranking dos 3 melhores dias :         

> ◈T O P 3D I A S D E V E N D A ·Ú L T I M O S 3 0 D I A S

🥇 Sábado , 14/06  R$ 3.213 · 15 vendas · ROAS 5,9x 

🥈 Sexta , 20/06  R$ 2.889 · 13 vendas · ROAS 5,2x 

🥉 Domingo , 08/06  R$ 2.541 · 11 vendas · ROAS 4,8x 

Os 3 melhores dias têm algo em comum : sábado e sexta à tarde . Esse padrão é consistente no seu histórico . Recomendo concentrar os lançamentos de criativos novos às quintas — assim entram otimizados para o final de semana .

⟳ buscando histórico de 6 meses...    

> AN JARVIS via @analyst ·HISTÓRICO

Jarvis , como foi essa semana ? Compara com a semana passada .

> V O C Ê

Pausa dos 2 criativos saturados (segunda -feira ) reduziu CPM em 18% ✓

Novo vídeo lançado na terça entrou como winner com ROAS 6,8 x✓

Escala do Carrinho Abandonado gerou 9 vendas extras com CPA R$ 28 ✓

E no mês ? Qual foi o meu melhor dia de vendas dos últimos 30? 

> V O C Ê

Qual foi meu ROAS médio nos últimos 6 meses ? Estou evoluindo ?

> V O C Ê

Evolução do ROAS mês a mês nos últimos 6 meses :      

> ◈H I S T Ó R I C O D E R O A S ·J A N – J U N 2 0 2 6

Janeiro  2,3x · fase de ajuste pós-troca de agência 

Fevereiro  2,1x · pior mês — saturação máxima 

Março  2,8x · início das otimizações 

Abril  3,4x · novos criativos entraram 

Maio  3,9x · escala das campanhas de retargeting 

Junho (até hoje ) 4,2x · melhor mês do período     

> SIM, VOCÊ ESTÁ EVOLUINDO

— crescimento contínuo por 5 meses consecutivos , de 2,1 x para 4,2 x (+100%). A trajetória é consistente . A queda de janeiro /fevereiro foi o impacto da troca de agência — os últimos 4 meses mostram que a estratégia está no caminho certo .◈ M Ó D U L O 0 4 · R E L A T Ó R I O 

## Relatórios — Quando o Diálogo vira Documento 

Quando você precisa apresentar resultados para um cliente , sócio ou liderança — JARVIS transforma toda a análise da conversa em um relatório executivo formatado .

◈ C E N A 7 — F i n a l d o m ê s — R e l a t ó r i o p a r a o c l i e n t e 

JARVIS · META ADS  GERAÇÃO DE RELATÓRIO      

> Ú L T I M O D I A D O M Ê S ·1 6 : 0 0

⟳ compilando dados do mês · formatando relatório executivo...    

> SM JARVIS via @sm ·RELATÓRIO EXECUTIVO

Relatório gerado . Aqui está o sumário — o documento completo foi salvo em PDF :

Jarvis , gera o relatório mensal para apresentar para o dono da Vitá Store amanhã . Ele não entende de tráfego — precisa ser claro ,

com os números do mês , o que melhorou e o que vamos fazer no próximo mês .

> V O C Ê

RELATÓRIO MENSAL — VITÁ STORE · JUNHO 2026 

> META ADS · GERADO PELO JARVIS AIOS CORE · CONFIDENCIAL

# R$ 62.481 

> RECEITA ATRIBUÍDA

↑ +67% vs . maio 

# 4,2x 

> ROAS DO MÊS

↑ de 3,9 x em maio 

# R$ 48,90 

> CPA MÉDIO

↓ de R$ 56 em maio 

O que aconteceu este mês 

Junho foi o melhor mês dos últimos 6 em todos os indicadores . As campanhas de retargeting (visitantes + carrinho abandonado ) responderam por 58% do faturamento total com ROAS acima de 6x. A estratégia de trocar criativos a cada 3 semanas evitou a saturação que derrubou os resultados em fevereiro .

Carrinho Abandonado  ROAS  7,2x  Vendas  68  Gasto  R$ 900 

Remarketing 30 dias  ROAS  5,8x  Vendas  84  Gasto  R$ 1.800 

Prospecção — Interesses  ROAS  3,1x  Vendas  56  Gasto  R$ 3.400 

Lookalike 1% Compradores  ROAS  1,3x  Vendas  8 Gasto  R$ 1.200 

Plano para julho 

◈ C E N A 8 — C o n f i g u r a n d o a l e r t a s a u t o m á t i c o s 

Pausar Lookalike 1% ( economiza R$ 1.200) e realocar para Remarketing ✓

Lançar 3 novos criativos na primeira semana (vídeos 15 s)✓

Testar público de engajamento de vídeo (75% assistido )✓

Meta : ROAS 4,5 x com mesmo investimento de R$ 8.000 ✓JARVIS · META ADS  AUTOMAÇÃO · @devops    

> DO JARVIS via @devop s ·CONFIGURANDO ALERTAS

Configurando sistema de monitoramento proativo . Quais limites você quer que eu use ? Sugestão baseada no histórico da Vitá Store :  

> ◈A L E R T A S S U G E R I D O S

ROAS abaixo de  3,0x por mais de 2h 

Frequência acima de  3,5x em qualquer campanha 

CPA acima de  R$ 70 no dia 

CTR abaixo de  0,8% por 24h 

Relatório semanal todo  domingo às 19h 

Confirma esses limites ?  

> DO JARVIS via @devop s
> MONITORAMENTO ATIVO

5 alertas configurados . A partir de agora , o JARVIS monitora suas campanhas a cada 30 minutos e te avisa proativamente — via WhatsApp e no chat —

quando qualquer indicador sair dos limites definidos .

Você não precisa mais checar o Gerenciador de Anúncios todo dia . O JARVIS te chama quando algo precisar da sua atenção .

Jarvis , quero que você me avise automaticamente quando algo sair do controle nas campanhas . Sem eu precisar perguntar .

> V O C Ê

Confirmo . Manda os alertas para meu WhatsApp também .  

> V O C Ê ◈R E F E R Ê N C I A R Á P I D A

# 50 Perguntas Prontas para  Usar com JARVIS 

Cole qualquer uma dessas perguntas no chat com o JARVIS . Ele vai buscar os dados da sua conta e responder com os números reais .

◈ A C O M P A N H A M E N T O D I Á R I O 

❝ Como estão minhas campanhas hoje ? ❞

→ JARVIS busca resultados do dia : vendas ,

faturamento e ROAS 

❝ Qual campanha está vendendo mais agora ? ❞

→ Ranking das campanhas por volume de vendas em tempo real 

❝ Qual anúncio tem o melhor desempenho hoje ? ❞

→ Análise criativo a criativo com CTR , CPA eROAS 

❝ Quanto gastei e quanto faturei hoje ? ❞

→ Gasto vs . receita do dia com ROAS calculado 

❝ Meu CPA está dentro do limite hoje ? ❞

→ Compara CPA atual com o seu alvo e calcula o lucro por venda 

❝ Tem alguma campanha gastando mas não vendendo ? ❞

→ Lista campanhas com gasto positivo e ROAS abaixo de 1,5 x

◈ D I A G N Ó S T I C O E P R O B L E M A S 

❝ Por que meu ROAS caiu essa semana ? ❞

→ Investigação cruzando CPM , CTR e CVR para identificar a causa raiz 

❝ Meu público está saturado ? ❞

→ Verifica frequência por campanha e alerta sobre saturação 

❝ O que está matando meu ROAS agora ?

❞

→ Diagnóstico completo dos 3 principais problemas com priorização 

❝ Por que meu CTR caiu ? ❞

→ Analisa se é problema de criativo , público ou saturação 

❝ Qual campanha está queimando dinheiro ? ❞❝ Meu CPM está alto ? Por quê ? ❞→ Lista campanhas com ROAS abaixo do ponto de equilíbrio 

→ Compara CPM atual com histórico e identifica se é mercado ou segmentação    

> ◈C O M P A R A T I V O S EH I S T Ó R I C O

❝ Como foi essa semana vs . semana passada ? ❞

→ Comparativo completo : vendas , ROAS , CPA ,

investimento 

❝ Qual foi meu melhor mês dos últimos 6? 

❞

→ Ranking mensal com análise do que causou os melhores resultados 

❝ Esse lançamento performou melhor que o anterior ? ❞

→ Comparativo direto entre dois períodos ou campanhas específicas 

❝ Qual horário do dia gera mais vendas ? ❞

→ Análise de performance por hora com omelhor janela para escalar 

❝ Estou evoluindo comparado a 3 meses atrás ? ❞

→ Gráfico de evolução de ROAS com análise de tendência 

❝ Qual dia da semana vendo mais ? ❞

→ Breakdown de vendas por dia da semana nos últimos 30 dias    

> ◈D E C I S Õ E S EO T I M I Z A Ç Õ E S

❝ Devo aumentar o orçamento da campanha X? ❞

→ Análise de capacidade de escala com projeção de retorno 

❝ Qual campanha pausar para liberar orçamento ? ❞

→ Ranking de eficiência com recomendação clara de corte 

❝ Qual criativo devo escalar ? ❞

→ Winner da semana com análise de por que está funcionando 

❝ Meus novos criativos estão performando ? ❞

→ Comparativo entre criativos novos vs . antigos 

❝ Devo testar um público novo ? ❞

→ Análise de saturação e sugestão do próximo público a testar 

❝ Qual o melhor momento para lançar um criativo ? ❞

→ Recomendação de dia /hora baseada no histórico de performance  

> ◈R E L A T Ó R I O S

❝ Gera o relatório do mês para meu cliente  ❞

→ Relatório executivo em PDF , linguagem não técnica 

❝ Faz um resumo da semana em 3 linhas 

❞

→ Síntese executiva : o que foi bem , o que foi mal , o que fazer 

❝ Quero receber um relatório toda segunda -feira  ❞

→ Configura envio automático semanal via e-

mail ou WhatsApp 

❝ Me avisa se o ROAS cair abaixo de 3x ❞

→ Configura alerta proativo com threshold personalizado 

# 50 

Perguntas 

prontas 

# 2

Modos de 

análise 

# 0

Conhecimento 

técnico necessário 

# 24/7 

JARVIS 

disponível 

J A R V I S · A I O S C O R E · M E T A A D S I N T E L L I G E N C E 

Você não precisa ser gestor de tráfego para  tomar decisões de tráfego certeiras .

Só precisa saber fazer as perguntas certas — e o JARVIS faz o resto .
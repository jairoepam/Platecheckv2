# Plano de interface — Conferência Expressa

## Objetivo da experiência

O aplicativo será utilizado em orientação vertical, com operação confortável usando uma só mão. A proposta é permitir que o operador fotografe, na **mesma imagem**, a folha impressa do sistema e a placa Mercosul produzida. O app lê as duas sequências, compara cada posição e devolve uma decisão visual simples: **Aprovada**, **Divergente** ou **Revisão necessária**.

O desenho seguirá o padrão de aplicativos iOS: hierarquia tipográfica clara, superfícies brancas, ações primárias em azul, botões amplos na região inferior e feedback semântico de status. A interface não exigirá conta nem sincronização em nuvem; o histórico permanecerá no dispositivo.

## Lista de telas

| Tela | Conteúdo principal | Função |
|---|---|---|
| Início | Mensagem de valor, instrução de foto única, roteiro em três passos, acesso ao histórico e botão principal | Iniciar uma nova conferência sem ambiguidade |
| Captura | Visualização da câmera, moldura para os dois itens, divisor central, legendas “Folha impressa” e “Placa Mercosul”, captura e cancelamento | Orientar o enquadramento de uma única fotografia |
| Processamento | Miniatura, tempo decorrido, barra de progresso e checklist de análise | Informar que a foto foi recebida e que a leitura está em andamento |
| Resultado aprovado | Cabeçalho verde, duas sequências lidas, comparação de sete caracteres, métricas e ações seguintes | Confirmar que a placa produzida corresponde à folha |
| Resultado divergente | Cabeçalho vermelho, posições divergentes e contagem das diferenças | Alertar o operador e indicar exatamente onde ocorre a divergência |
| Resultado inconclusivo | Cabeçalho amarelo, orientação de nova captura e motivo de baixa confiança | Evitar uma decisão indevida quando a leitura da imagem for insuficiente |
| Histórico | Resumo de totais, lista cronológica e opção de limpar registros | Consultar conferências realizadas localmente |

## Conteúdo e interação por tela

Na tela de início, a frase de destaque será “**Uma foto. Duas sequências. Uma decisão.**”. Abaixo, uma explicação curta reforçará que a folha e a placa precisam estar visíveis na mesma foto. O botão “Fotografar conferência” ficará na parte inferior, com altura mínima de 52 px, para facilitar o toque com o polegar.

Na captura, a folha ocupará preferencialmente a metade superior do enquadramento e a placa a metade inferior. Uma moldura em quatro cantos e um divisor horizontal informarão a posição sugerida, sem bloquear a leitura da câmera. O cancelamento estará no canto superior esquerdo, e o botão de disparo será central e grande.

Durante o processamento, os estados serão apresentados de forma sequencial: “Localizando as duas regiões”, “Lendo as sequências” e “Comparando caractere a caractere”. O temporizador exibirá o tempo real decorrido, sem prometer um valor fixo. A meta do produto será aproximar a resposta observada no aplicativo anterior, por volta de sete segundos em conexão e imagem adequadas.

Nos resultados, as duas sequências serão sempre apresentadas em blocos distintos, junto de uma grade de sete posições. Caracteres iguais recebem fundo verde suave; divergências recebem fundo vermelho suave; caracteres não lidos são marcados como revisão. As ações seguintes ficam fixadas visualmente ao final do conteúdo: “Nova conferência” como ação principal e “Voltar ao início” como alternativa.

## Fluxos principais

| Fluxo | Etapas |
|---|---|
| Conferência aprovada | Início → Fotografar conferência → Alinhar folha e placa → Capturar → Processamento → Resultado aprovado → Nova conferência ou início |
| Conferência divergente | Início → Fotografar conferência → Capturar → Processamento → Resultado divergente com posições destacadas → Nova conferência ou início |
| Leitura inconclusiva | Início → Fotografar conferência → Capturar foto pouco legível → Processamento → Revisão necessária → Fotografar novamente |
| Consulta ao histórico | Início → Histórico → Visualizar status, código, data e confiança → Limpar registros, se desejado |

## Paleta e identidade

| Elemento | Cor | Uso |
|---|---:|---|
| Azul principal | `#0056D2` | Botões, progresso, destaque da captura e navegação ativa |
| Azul claro | `#EAF2FF` | Fundos informativos e estados neutros |
| Texto principal | `#142033` | Títulos, sequências e informações críticas |
| Texto secundário | `#627089` | Orientações, rótulos e metadados |
| Sucesso | `#178A4B` | Resultado aprovado e caracteres coincidentes |
| Atenção | `#C97800` | Resultado inconclusivo e orientação de nova captura |
| Erro | `#C93737` | Resultado divergente e posições diferentes |
| Fundo | `#F7F9FC` | Área geral de conteúdo |

## Critérios de qualidade

O aplicativo deve manter a câmera em modo retrato, usar feedback tátil discreto nas ações principais e preservar a acessibilidade por contraste, tamanho de toque e descrições de estado. A análise será executada no servidor, evitando expor credenciais no dispositivo. A foto é enviada apenas para a análise solicitada; o histórico local guarda o resultado e os metadados, não a imagem, salvo futura solicitação explícita de retenção.

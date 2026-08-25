# Project TODO

- [x] Aplicar a identidade visual do Conferência Expressa, incluindo tema e navegação.
- [x] Implementar tela inicial com instrução de foto única e acesso ao histórico.
- [x] Implementar captura pela câmera com guia para folha impressa e placa Mercosul na mesma imagem.
- [x] Permitir selecionar uma foto da galeria como alternativa à captura ao vivo.
- [x] Criar endpoint seguro para receber a fotografia e extrair as duas sequências por IA.
- [x] Comparar as sequências caractere a caractere e classificar o resultado como aprovado, divergente ou inconclusivo.
- [x] Implementar tela de processamento com progresso, temporizador e feedback compreensível.
- [x] Implementar telas de resultado com evidência visual das posições comparadas.
- [x] Persistir o histórico de conferências somente no dispositivo.
- [x] Implementar tela de histórico com contadores e limpeza local.
- [x] Gerar e aplicar ícone próprio do aplicativo nas configurações obrigatórias.
- [x] Escrever testes unitários para a comparação das sequências e a classificação do resultado.
- [x] Validar tipagem, testes e fluxos com dados determinísticos antes da entrega.
- [x] Corrigir a decisão para aprovar sequências equivalentes lidas na folha e na placa.
- [x] Tratar equivalências visuais de OCR entre 1/I, 0/O, G/C, 8/B e 5/S com base na posição esperada da placa Mercosul.
- [x] Tornar a indicação de tempo de análise discreta na tela de processamento.
- [x] Cobrir os novos cenários de equivalência com testes unitários e validar a compilação.

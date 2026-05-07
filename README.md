# WebApp Delivery Optimizer

Web app desenvolvido para demonstrar o funcionamento de um algoritmo genético aplicado à otimização de rotas de entrega.

O projeto simula um cenário em que uma empresa precisa realizar entregas em diferentes pontos e deseja encontrar uma rota com menor distância total. Para isso, o sistema utiliza conceitos de algoritmos genéticos, como população, indivíduo, fitness, seleção, cruzamento, mutação e elitismo.

## Contexto da atividade

Este projeto foi desenvolvido como parte de uma atividade da disciplina de Fundamentos de Inteligência Artificial.

A proposta da atividade era utilizar IA generativa para criar um web app que demonstrasse o funcionamento de um algoritmo genético aplicado a uma tarefa real.

A tarefa escolhida foi a otimização de rotas de entrega, por se tratar de um problema próximo de aplicações reais em logística, transporte e distribuição.

## Uso de IA generativa no desenvolvimento

A IA generativa foi utilizada em diferentes etapas do projeto:

### ChatGPT

O ChatGPT foi utilizado para:

- compreender melhor a proposta da atividade;
- levantar ideias de web apps simples relacionados a algoritmos genéticos;
- escolher o problema de otimização de rotas de entrega;
- estruturar o contexto acadêmico do projeto;
- elaborar o prompt completo para orientar o desenvolvimento do web app;
- auxiliar na explicação dos conceitos envolvidos no algoritmo genético.

### Claude

O Claude foi utilizado para:

- gerar a estrutura inicial do web app;
- desenvolver a interface visual;
- implementar a lógica do algoritmo genético;
- organizar os arquivos HTML, CSS e JavaScript;
- criar uma versão funcional do projeto com base no prompt elaborado.

## Objetivo do projeto

O objetivo do projeto é apresentar, de forma visual e didática, como um algoritmo genético pode ser utilizado para buscar uma solução otimizada para um problema de rotas.

O sistema gera pontos de entrega em uma área visual e tenta encontrar uma ordem de visita que reduza a distância total percorrida.

## Problema abordado

O problema consiste em encontrar uma boa rota para visitar todos os pontos de entrega e retornar ao ponto inicial, representado como depósito.

Esse tipo de problema está relacionado ao problema do caixeiro-viajante, no qual é necessário encontrar uma sequência eficiente de visitas entre diferentes locais.

Neste projeto, o foco não é garantir a melhor solução possível em todos os casos, mas demonstrar como o algoritmo genético evolui soluções ao longo das gerações.

## Conceitos de algoritmo genético aplicados

### População

Conjunto de várias rotas candidatas geradas aleatoriamente.

### Indivíduo

Uma rota possível entre os pontos de entrega.

### Gene

Cada ponto de entrega dentro de uma rota.

### Fitness

Medida de qualidade de uma rota.

Neste projeto, o fitness é baseado na distância total percorrida. Quanto menor a distância, melhor a solução.

### Seleção

Processo de escolha dos indivíduos mais aptos para gerar novas soluções.

### Cruzamento

Combinação de duas rotas para gerar uma nova rota.

### Mutação

Pequena alteração aleatória em uma rota, geralmente trocando dois pontos de posição.

### Elitismo

Preservação da melhor rota encontrada para que ela não seja perdida nas próximas gerações.

## Funcionamento do sistema

O funcionamento geral do web app segue as seguintes etapas:

1. O usuário define os parâmetros da simulação.
2. O sistema gera pontos de entrega aleatórios.
3. O algoritmo cria uma população inicial de rotas.
4. Cada rota é avaliada pela distância total percorrida.
5. As melhores rotas são selecionadas.
6. Novas rotas são geradas por cruzamento.
7. Algumas rotas sofrem mutação.
8. A melhor rota é preservada por elitismo.
9. O processo se repete por várias gerações.
10. O sistema exibe a melhor rota encontrada e as estatísticas da execução.

## Funcionalidades

- Geração aleatória de pontos de entrega.
- Visualização dos pontos em uma área gráfica.
- Execução de algoritmo genético em tempo real.
- Exibição da melhor rota encontrada.
- Configuração da quantidade de pontos.
- Configuração do tamanho da população.
- Configuração do número máximo de gerações.
- Configuração da taxa de mutação.
- Estatísticas da execução.
- Histórico de evolução da melhor distância.
- Área explicativa sobre o algoritmo genético.
- Interface simples e didática.

## Tecnologias utilizadas

- HTML
- CSS
- JavaScript
- Vercel para deploy

## Estrutura do projeto

```text
WebApp_deliveryOptimizer/
│
├── index.html
├── style.css
├── script.js
└── README.md
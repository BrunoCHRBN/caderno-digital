# Caderno Digital

Aplicação web desenvolvida para anotações manuscritas e organização de estudos em computadores com mesa digitalizadora (stylus Wacom, Huion ou compatíveis com a W3C Pointer Events API).

---

## Arquitetura do Sistema

```
                      +-----------------------------+
                      |     Stylus Wacom / Pen      |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Pointer Events API        |
                      |   (x, y, pressure, buttons) |
                      +-----------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
             v                                               v
+--------------------------+                   +--------------------------+
| Inking Engine            |                   | Shape Recognition Engine |
| - perfect-freehand       |                   | - Spatial window (350ms) |
| - Double-Buffering (O(1))|                   | - Ramer-Douglas-Peucker  |
| - desynchronized: true   |                   | - Shoelace Area Metric   |
+--------------------------+                   | - Magnetic Snap (22px)   |
             |                                 +--------------------------+
             +-----------------------+-----------------------+
                                     |
                                     v
                      +-----------------------------+
                      |  IndexedDB Storage (Dexie)  |
                      |  (Subjects, Notebooks,      |
                      |   Vector Page Data)         |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |  PDF Exporter (jsPDF)       |
                      |  - Vector rendering         |
                      |  - Bounding-box fitting     |
                      +-----------------------------+
```

---

## Funcionalidades Técnicas

### 1. Motor de Tinta e Renderização
- **Arquitetura Double-Buffering**: Separação física entre a camada base (fundo e traços consolidados) e a camada overlay (traço em andamento), eliminando o custo de redesenho cumulativo e garantindo latência $O(1)$ durante a escrita.
- **Contexto Acelerado por Hardware**: Canvas 2D configurado com `desynchronized: true` para redução de latência no compositor do navegador.
- **Curvas de Sensibilidade**: Normalização da leitura de pressão física (`0.0` a `1.0`) com curvas de resposta paramétricas (Linear, Macia $\gamma < 1$, Firme $\gamma > 1$).
- **Ferramentas Suportadas**:
  - Caneta esferográfica sensível a pressão com variação contínua de diâmetro.
  - Marca-texto translúcido com operação de composição `multiply` para preservar a legibilidade de pautas e linhas anteriores.
  - Borracha vetorial inteligente acionável instantaneamente via clique secundário (botão lateral da caneta).

### 2. Reconhecimento Geométrico de Formas (*Draw and Hold*)
- **Janela de Deslocamento Espacial**: Detecção de repouso da ponta baseada em deslocamento euclidiano ($r \le 8\text{px}$) em vez de suspensão de eventos brutos de hardware. Permite que o temporizador de $350\text{ms}$ execute sem sofrer cancelamentos espúrios por oscilações submétricas do sensor de pressão.
- **Classificação Poligonal com Ramer-Douglas-Peucker (RDP)**:
  - **Triângulos**: Identificação de 3 vértices com deflexão angular $< 145^\circ$ ou razão de área de Shoelace para bounding box $\le 0.65$.
  - **Retângulos e Quadrados**: Identificação de 4 cantos em $90^\circ$ ou taxa de preenchimento de caixa $\ge 0.65$.
  - **Circunferências e Elipses**: Verificação de circularidade $\frac{4\pi A}{P^2} \ge 0.70$ na ausência de vértices pontiagudos.
  - **Linhas e Vetores**: Avaliação de corredor de desvio perpendicular máximo ($\le 22\text{px}$) com suporte a terminação em flecha de vetor simétrica.
- **União Magnética de Vértices (*Endpoint Snapping*)**: Conexão automática das extremidades de retas aos vértices de traços pré-existentes a um raio de até $24\text{px}$, permitindo fechar figuras geométricas e diagramas sem folgas.

### 3. Modos de Folha e Navegação
- **Modo A4 Paginado**: Renderização em proporção 1:1.414 ($1240 \times 1754\text{ px}$ a $\sim 150\text{ DPI}$) com paginação sequencial e suporte a exportação compatível com impressão.
- **Modo Canvas Infinito**: Transformação de visualização afim com pan contínuo e zoom de $25\%$ a $400\%$.
- **Templates Paramétricos**: Pautado (linhas a cada 40px com margem vertical guia), Quadriculado (30x30px), Pontilhado (30px) e Liso.
- **Navegação com Roda e Touchpad**: Pan bidimensional suave por rolagem de scroll e zoom centralizado no cursor via `Ctrl + Scroll` ou pinça.

### 4. Persistência Local e Exportação
- **Banco de Dados Local (IndexedDB)**: Implementado com Dexie.js para gravação assíncrona imediata a cada traço concluído (`pointerup`).
- **Exportação Vetorial para PDF**: Compilação multi-página via `jsPDF`. No formato Infinito, o exportador calcula a bounding box real do conteúdo manuscrito e ajusta a escala proporcionalmente às margens da folha A4.
- **Backup Completo**: Exportação e importação integral da base em arquivo `.json`.

---

## Mapeamento de Atalhos

| Entrada | Ação |
| :--- | :--- |
| `B` ou `P` | Selecionar Caneta |
| `H` | Selecionar Marca-texto |
| `E` | Selecionar Borracha |
| `Botão Lateral da Caneta` | Alterna temporariamente para a Borracha enquanto pressionado |
| `Ctrl + Z` | Desfazer último traço |
| `Ctrl + Y` ou `Ctrl + Shift + Z` | Refazer último traço |
| `[` / `]` | Diminuir / Aumentar espessura da ponta |
| `Espaço + Arrastar` | Pan da folha sem desenhar |
| `Scroll do Mouse` | Pan vertical e horizontal |
| `Ctrl + Scroll` | Zoom in / Zoom out |
| `Ctrl + B` | Alternar exibição da barra lateral |
| `F` ou `F11` | Alternar Modo Foco (oculta cabeçalho e barras laterais) |

---

## Estrutura do Projeto

```
caderno-digital/
├── src/
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── CanvasContainer.tsx   # Wrapper com navegação, pan e paginação
│   │   │   └── DrawingCanvas.tsx     # Double-buffering canvas (base + overlay)
│   │   ├── Dashboard/
│   │   │   └── DashboardView.tsx     # Hub de matérias, cadernos e estatísticas
│   │   ├── Modals/
│   │   │   ├── CalibrationModal.tsx  # Calibração de pressão e teste Wacom
│   │   │   ├── ExportModal.tsx       # Exportação PDF, PNG e backup JSON
│   │   │   ├── NewNotebookModal.tsx  # Criação e gestão de cadernos
│   │   │   └── NewSubjectModal.tsx   # Criação e gestão de disciplinas
│   │   ├── PageGrid/
│   │   │   └── PageGridView.tsx      # Grid de miniaturas e reordenação de folhas
│   │   ├── Header.tsx                # Breadcrumbs, seletores de folha e zoom
│   │   ├── Sidebar.tsx               # Árvore hierárquica colapsável de estudos
│   │   ├── Toolbar.tsx               # Barra de ferramentas, espessura e cores
│   │   └── Toast.tsx                 # Notificações assíncronas não-bloqueantes
│   ├── engine/
│   │   ├── inking.ts                 # Contornos vetoriais com perfect-freehand
│   │   ├── pdfExport.ts              # Compilador de PDF com bounding-box fitting
│   │   ├── renderGrid.ts             # Pautas, quadriculados e pontos paramétricos
│   │   └── shapeRecognition.ts       # RDP, Shoelace e união magnética
│   ├── hooks/
│   │   ├── usePointerInput.ts        # Captura e tratamento de eventos da Wacom
│   │   └── useShortcuts.ts           # Listeners de teclado e comandos rápidos
│   ├── store/
│   │   ├── useCanvasStore.ts         # Estado de ferramentas, histórico e viewport
│   │   └── useNotebookStore.ts       # Estado de matérias, cadernos e páginas
│   ├── types/
│   │   ├── canvas.ts                 # Interfaces de traços, pontos e ferramentas
│   │   └── notebook.ts               # Interfaces de matérias, cadernos e folhas
│   ├── db/
│   │   └── index.ts                  # Esquemas e tabelas do Dexie.js
│   ├── App.tsx                       # Roteamento de telas e modais
│   ├── main.tsx                      # Ponto de entrada React 19
│   └── index.css                     # Diretivas Tailwind e reset de gestos touch
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Tecnologias Utilizadas

- **React 19** com **TypeScript**
- **Vite** para empacotamento e build
- **Tailwind CSS** para estilização e Design System
- **perfect-freehand** para cálculo poligonal de traços sensíveis a pressão
- **Dexie.js** (IndexedDB) para armazenamento vetorial persistente offline
- **jsPDF** para compilação vetorial de documentos
- **@radix-ui/react-dialog** para diálogos acessíveis sem reflow
- **lucide-react** para iconografia

---

## Instalação e Execução

### Pré-requisitos
- Node.js $\ge$ 18.0.0
- npm $\ge$ 9.0.0

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/BrunoCHRBN/caderno-digital.git
cd caderno-digital
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Para compilar a versão de produção:
```bash
npm run build
npm run preview
```

---

## Licença

Distribuído sob a licença [MIT](LICENSE).

// scripts/uploadResources.js
// Run: node scripts/uploadResources.js /caminho/para/serviceAccountKey.json
// or: SERVICE_ACCOUNT_PATH=/path/to/key.json node scripts/uploadResources.js

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

async function main() {
  // caminho da chave (1º arg) ou env var
  const keyPath = process.argv[2] || process.env.SERVICE_ACCOUNT_PATH;
  if (!keyPath) {
    console.error("Erro: informe o caminho do serviceAccount JSON como argumento ou SERVICE_ACCOUNT_PATH.");
    process.exit(1);
  }
  const abs = path.isAbsolute(keyPath) ? keyPath : path.join(process.cwd(), keyPath);
  if (!fs.existsSync(abs)) {
    console.error("Arquivo não encontrado:", abs);
    process.exit(1);
  }

  const serviceAccount = require(abs);

  // inicializa admin
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  // lista de recursos (baseado na sua mensagem)
  const resources = [
    // CIÊNCIAS HUMANAS
    {
      title: "Pré-socráticos e Escolas Helenísticas (Filosofia)",
      summary: "Vídeos sobre pré-socráticos e escolas helenísticas — conceitos iniciais.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://youtu.be/7Ou8VIYbN74",
      tags: ["filosofia","presocraticos","helenismo"],
    },
    {
      title: "Pré-socráticos — Aula complementar (Filosofia)",
      summary: "Outro vídeo útil sobre pré-socráticos e escolas helenísticas.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://youtu.be/j0BXieL1FF8",
      tags: ["filosofia","presocraticos"],
    },
    {
      title: "História Antiga - Introdução",
      summary: "Panorama da história antiga e transições para a Idade Média.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://youtu.be/YRu9j0yIwxw",
      tags: ["historia","antiga"],
    },
    {
      title: "Idade Média — resumo",
      summary: "Principais eventos e estruturas sociais da Idade Média.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://youtu.be/xYRsIQT-Qmc",
      tags: ["historia","idade-media"],
    },
    {
      title: "Hidrografia e Clima (Geografia)",
      summary: "Aulas sobre hidrografia e padrões climáticos.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://www.youtube.com/watch?v=OMD04CU1UBs",
      tags: ["geografia","hidrografia","clima"],
    },
    {
      title: "Hidrografia e clima - Aula 2",
      summary: "Conteúdo complementar sobre rios e clima.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://www.youtube.com/watch?v=D3YQ6zl3-2M",
      tags: ["geografia","hidrografia"],
    },
    {
      title: "Formas de organização social (Sociologia)",
      summary: "Vídeo sobre organização social e estruturas sociológicas.",
      category: "Ciências Humanas",
      type: "video",
      url: "https://www.youtube.com/watch?v=LfIqsjSTh1Y",
      tags: ["sociologia","organizacao-social"],
    },

    // LINGUAGENS
    {
      title: "Gramática: conceitos (Português)",
      summary: "Gramática: introdução e conceitos fundamentais.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=X61lboe5_pM",
      tags: ["portugues","gramatica","sintaxe"],
    },
    {
      title: "Sintaxe: funções sintáticas",
      summary: "Aula sobre sintaxe e análise sintática.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=7-2UXgg9d-k",
      tags: ["portugues","sintaxe"],
    },
    {
      title: "Morfologia — conceitos básicos",
      summary: "Morfologia: classes de palavras e flexões.",
      category: "Linguagens",
      type: "video",
      url: "https://youtu.be/bWtHILzAMUk",
      tags: ["portugues","morfologia"],
    },
    {
      title: "Desenho e Teatro (Artes)",
      summary: "Introdução a técnicas de desenho e noções básicas de teatro.",
      category: "Linguagens",
      type: "video",
      url: "https://youtu.be/I-wB6qEpGBQ",
      tags: ["artes","desenho","teatro"],
    },
    {
      title: "Espanhol — gramática e vocabulário básico",
      summary: "Aulas sobre gramática, dias da semana e cores em espanhol.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=5kLt2ar2Hck&list=PLLbbJn2Feyj6Zb-eRT9T5_kr6PhnTSQi0",
      tags: ["espanhol","gramatica","vocabulário"],
    },
    {
      title: "Espanhol — cores e dias da semana",
      summary: "Vídeo prático para aprender cores e dias da semana em espanhol.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=pOewhg7cqmY",
      tags: ["espanhol","cores","dias"],
    },
    {
      title: "Inglês — tempos verbais e adjetivos",
      summary: "Consolidação de tempos verbais, pronomes e advérbios.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=cGb4qwKV-to",
      tags: ["ingles","tempos-verbais","gramatica"],
    },
    {
      title: "Inglês — prática de tempos",
      summary: "Exercícios para reforçar os tempos verbais em inglês.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=SceDmiBEESI",
      tags: ["ingles","pratica"],
    },
    {
      title: "Educação Física — Ginástica e jogos",
      summary: "Aulas e demonstrações de ginástica e atividades físicas.",
      category: "Linguagens",
      type: "video",
      url: "https://www.youtube.com/watch?v=bqBj9xppFZw",
      tags: ["ed-fisica","ginastica","esportes"],
    },

    // CIÊNCIAS DA NATUREZA
    {
      title: "Química — Princípios fundamentais da matéria",
      summary: "Introdução aos estados físicos e propriedades da matéria.",
      category: "Ciências da Natureza",
      type: "video",
      url: "https://www.youtube.com/watch?v=fHFDMh9-998",
      tags: ["quimica","materia","estados-da-materia"],
    },
    {
      title: "Física — Mecânica e Cinemática (aula)",
      summary: "Conceitos de mecânica e cinemática para iniciantes.",
      category: "Ciências da Natureza",
      type: "video",
      url: "https://www.youtube.com/watch?v=b036gP_K8cM",
      tags: ["fisica","mecanica","cinetica"],
    },
    {
      title: "Biologia — Citologia e Histologia",
      summary: "Introdução à célula e tecidos — citologia e histologia.",
      category: "Ciências da Natureza",
      type: "video",
      url: "https://www.youtube.com/watch?v=mD2hG5rE5j4",
      tags: ["biologia","citologia","histologia"],
    },

    // MATEMÁTICA
    {
      title: "Progressão Aritmética (PA) — Introdução",
      summary: "Definições básicas e exemplos de progressão aritmética.",
      category: "Matemática",
      type: "video",
      url: "https://www.youtube.com/watch?v=poyvpdAC4xI",
      tags: ["matematica","pa","progressao"],
    },
    {
      title: "Progressão Geométrica (PG) — Exercícios",
      summary: "Conceitos e problemas resolvidos de PG.",
      category: "Matemática",
      type: "video",
      url: "https://www.youtube.com/watch?v=haKrC4quHj8",
      tags: ["matematica","pg"],
    },
    {
      title: "Função Afim — conceito e gráficos",
      summary: "Função afim: definição, gráfico e exemplos.",
      category: "Matemática",
      type: "video",
      url: "https://www.youtube.com/watch?v=UompImyqT3I",
      tags: ["matematica","funcao-afim"],
    },
    {
      title: "Função Quadrática — estudo",
      summary: "Função quadrática: forma, vértice e aplicações.",
      category: "Matemática",
      type: "video",
      url: "https://www.youtube.com/watch?v=ZpW9Xb5iyt4",
      tags: ["matematica","funcao-quadratica"],
    }
  ];

  console.log(`Criando ${resources.length} recursos em 'resources'...`);

  for (const r of resources) {
    const docRef = db.collection("resources").doc(); // id auto
    const payload = {
      title: r.title,
      summary: r.summary || "",
      category: r.category || "Geral",
      type: r.type || "video",
      url: r.url || "",
      tags: r.tags || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    try {
      await docRef.set(payload);
      console.log("Criado:", payload.title);
    } catch (err) {
      console.error("Erro criando", r.title, err);
    }
  }

  console.log("Pronto — verifique a coleção 'resources' no Console do Firebase.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erro:", e);
  process.exit(1);
});
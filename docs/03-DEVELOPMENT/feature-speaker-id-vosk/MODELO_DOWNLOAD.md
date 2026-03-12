# Download e Configuração dos Modelos Vosk

## Modelo necessário: `vosk-model-spk-0.4`

Este é o modelo de **Speaker Identification** do Vosk. Ele **não** faz transcrição de fala — apenas extrai a "impressão digital" da voz (x-vector de 128 dimensões).

- **Tamanho:** ~30 MB
- **Licença:** Apache 2.0
- **Suporta:** Qualquer idioma (não depende de idioma)

---

## Download manual

### Opção A — Download direto (recomendado)

```
URL: https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip
```

1. Baixar o arquivo ZIP
2. Descompactar em `models/` na raiz do projeto:

```
meu-jarvis/
  models/
    vosk-model-spk-0.4/
      README
      final.dubm
      final.ie
      final.mat
      global_cmvn.stats
      ivector_extractor.conf
      mfcc.conf
      online_cmvn.conf
      splice_opts
```

### Opção B — PowerShell (Windows)

```powershell
# Na raiz do projeto
New-Item -ItemType Directory -Force -Path models
Invoke-WebRequest -Uri "https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip" -OutFile "models\vosk-model-spk-0.4.zip"
Expand-Archive -Path "models\vosk-model-spk-0.4.zip" -DestinationPath "models\" -Force
Remove-Item "models\vosk-model-spk-0.4.zip"
```

### Opção C — cURL (se disponível)

```bash
mkdir -p models
cd models
curl -LO https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip
unzip vosk-model-spk-0.4.zip
rm vosk-model-spk-0.4.zip
```

---

## Adicionar ao .gitignore

O diretório `models/` **não deve ir para o repositório** (são binários grandes).

Verificar se já está no `.gitignore`:

```
# .gitignore
models/
```

---

## Modelo de ASR (opcional)

Se quiser também fazer **transcrição de fala em português** localmente (sem Web Speech API), baixe adicionalmente:

```
URL: https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip
Tamanho: ~31 MB
```

Para esta feature de speaker ID, o modelo de ASR **não é obrigatório**.

---

## Verificar instalação

Após instalar o pacote `vosk` e baixar o modelo, rodar:

```javascript
// teste-vosk.js (na raiz do projeto)
const vosk = require('vosk')
const path = require('path')

const MODEL_PATH = path.join(__dirname, 'models', 'vosk-model-spk-0.4')

try {
  vosk.setLogLevel(0)
  const spkModel = new vosk.SpkModel(MODEL_PATH)
  console.log('✅ Modelo Vosk SpkModel carregado com sucesso!')
  console.log('   Path:', MODEL_PATH)
} catch (err) {
  console.error('❌ Erro ao carregar modelo:', err.message)
}
```

```powershell
node teste-vosk.js
```

Saída esperada:
```
✅ Modelo Vosk SpkModel carregado com sucesso!
   Path: D:\projetos\jarvis\models\vosk-model-spk-0.4
```

---

## Troubleshooting

### Erro: "Cannot find module 'vosk'"
```bash
npm install vosk
```

### Erro: "Failed to open model"
- Verificar se o caminho `models/vosk-model-spk-0.4/` existe
- Verificar se a pasta contém o arquivo `ivector_extractor.conf`

### Erro de binário nativo (node-gyp)
```bash
npm install --build-from-source vosk
```
Requer: Python 3, Visual Studio Build Tools (Windows), ou `build-essential` (Linux)

### Vosk não encontra o modelo no Next.js API Route
Usar `path.join(process.cwd(), 'models', 'vosk-model-spk-0.4')` — `process.cwd()` aponta para a raiz do projeto.

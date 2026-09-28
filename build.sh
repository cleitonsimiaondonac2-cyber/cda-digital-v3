#!/usr/bin/env bash
# Gera a pasta /docs (deploy GitHub Pages) a partir de /site (fonte de verdade).
# Mantém site/ como única fonte e evita divergência entre as duas pastas.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Sincronizando site/ → docs/ (deploy)..."
# --delete torna docs/ uma cópia fiel de site/ (remove arquivos órfãos)
# --inplace é obrigatório neste repositório: o /home está em ecryptfs, que
# impõe 143 bytes por nome de ficheiro. Sem --inplace, o rsync cria um
# ficheiro temporário ".<nome>.XXXXXX" antes de cada transferência e falha
# com "File name too long" (código 23) nos PDFs de nome longo do acervo.
# Com --inplace escreve directamente no destino e o problema desaparece.
rsync -a --delete --inplace site/ docs/

echo "==> Verificação: contagem de páginas e PDFs..."
echo "  páginas: $(ls site/*.html | wc -l) (site) / $(ls docs/*.html | wc -l) (docs)"
echo "  pdfs:    $(ls site/docs/*.pdf 2>/dev/null | wc -l) (site) / $(ls docs/docs/*.pdf 2>/dev/null | wc -l) (docs)"

echo "==> docs/ pronto para publicar (commit e push de docs/)."
